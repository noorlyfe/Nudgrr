import { useCallback, useEffect, useState, useMemo, type ReactNode } from "react";
import {
  ActivityIndicator,
  Linking,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { useRouter } from "expo-router";
import Purchases, {
  PACKAGE_TYPE,
  PURCHASES_ERROR_CODE,
  type PurchasesOfferings,
  type PurchasesPackage,
} from "react-native-purchases";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AppAlert } from "../components/AppAlert";
import { getAppStoreUrl } from "../constants/storeLinks";
import { fonts, radii, spacing, touchTarget, typography, type AppColors } from "../constants/theme";
import { isRevenueCatApiKeySet } from "../constants/purchases";
import { useLocale } from "../hooks/useLocale";
import { useColors } from "../hooks/useColors";
import { useTheme } from "../hooks/useTheme";
import { formatPaywallPriceLabel } from "../lib/paywallPriceDisplay";
import { rtlRow } from "../lib/rtl";
import { useProStatus } from "../hooks/useProStatus";
import { trackEvent } from "../lib/analytics";
import { safeRouterBack } from "../lib/safeRouterBack";
import { PRIVACY_POLICY_BODY } from "./privacy";

const APPLE_EULA_URL = "https://www.apple.com/legal/internet-services/itunes/dev/stdeula/";

const PAYWALL_FEATURE_KEYS = [
  "paywallFeatureUnlimitedNudges",
  "paywallFeatureReceiptPreview",
  "paywallFeatureWaitingGame",
  "paywallFeaturePeople",
  "paywallFeatureGroups",
  "paywallFeatureRemoveBranding",
  "paywallFeatureCustomHeader",
  "paywallFeatureFooter",
  "paywallFeatureNudgeWatermark",
] as const;

function pickSubscriptionPackage(offerings: PurchasesOfferings): PurchasesPackage | null {
  const current = offerings.current;
  if (!current) {
    return null;
  }
  if (current.monthly) {
    return current.monthly;
  }
  const monthly = current.availablePackages.find((p) => p.packageType === PACKAGE_TYPE.MONTHLY);
  if (monthly) {
    return monthly;
  }
  if (current.availablePackages.length > 0) {
    return current.availablePackages[0];
  }
  return null;
}

type PaywallStyles = ReturnType<typeof createStyles>;

function PaywallHero({
  styles,
  title,
  subtitle,
}: {
  styles: PaywallStyles;
  title: string;
  subtitle: string;
}) {
  return (
    <View style={styles.heroSection}>
      <View style={styles.heroFrame}>
        <Text style={styles.heroTitle}>{title}</Text>
      </View>
      <Text style={styles.heroSubtitle}>{subtitle}</Text>
    </View>
  );
}

function PaywallFeatureList({
  styles,
  labels,
  isRTL,
}: {
  styles: PaywallStyles;
  labels: string[];
  isRTL: boolean;
}) {
  return (
    <View style={styles.featureCard}>
      {labels.map((label) => (
        <View key={label} style={[styles.featureRow, rtlRow(isRTL)]}>
          <Text style={styles.featureCheck}>✓</Text>
          <Text style={[styles.featureText, isRTL ? styles.featureTextRtl : null]}>{label}</Text>
        </View>
      ))}
    </View>
  );
}

function PaywallPriceBlock({
  styles,
  subscriptionLabel,
  price,
}: {
  styles: PaywallStyles;
  subscriptionLabel: string;
  price: string;
}) {
  return (
    <View style={styles.priceBlock}>
      <Text style={styles.subscriptionLength}>{subscriptionLabel}</Text>
      <Text style={styles.price}>{price}</Text>
    </View>
  );
}

function PaywallLegalFooter({
  styles,
  isRTL,
  legalText,
  onPrivacy,
  onTerms,
  privacyLabel,
  termsLabel,
}: {
  styles: PaywallStyles;
  isRTL: boolean;
  legalText: string;
  onPrivacy: () => void;
  onTerms: () => void;
  privacyLabel: string;
  termsLabel: string;
}) {
  return (
    <>
      <Text style={styles.paywallLegal}>{legalText}</Text>
      <View style={[styles.paywallLegalLinksRow, rtlRow(isRTL)]}>
        <Pressable onPress={onPrivacy} hitSlop={8}>
          <Text style={styles.paywallLegalLink}>{privacyLabel}</Text>
        </Pressable>
        <Text style={styles.paywallLegalLinkSeparator}> · </Text>
        <Pressable onPress={onTerms} hitSlop={8}>
          <Text style={styles.paywallLegalLink}>{termsLabel}</Text>
        </Pressable>
      </View>
    </>
  );
}

export default function PaywallScreen() {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { t, locale, isRTL } = useLocale();
  const { isDark } = useTheme();
  const { refresh } = useProStatus();
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<"purchase" | "restore" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [packageToBuy, setPackageToBuy] = useState<PurchasesPackage | null>(null);
  const priceLabel = useMemo(
    () => formatPaywallPriceLabel(locale, t("perMonth")),
    [locale, t]
  );
  const hasTrial = useMemo(() => {
    const introPrice = packageToBuy?.product?.introPrice;
    return introPrice?.price === 0;
  }, [packageToBuy]);
  const [legalModal, setLegalModal] = useState<"privacy" | "terms" | null>(null);
  const [showPurchaseSuccessAlert, setShowPurchaseSuccessAlert] = useState(false);
  const [showPurchaseFailedAlert, setShowPurchaseFailedAlert] = useState(false);
  const [showRestoreSuccessAlert, setShowRestoreSuccessAlert] = useState(false);
  const [showRestoreFailedAlert, setShowRestoreFailedAlert] = useState(false);
  const [restoreFailedMessage, setRestoreFailedMessage] = useState("");

  const featureLabels = useMemo(
    () => PAYWALL_FEATURE_KEYS.map((key) => t(key)),
    [t]
  );

  const close = useCallback(() => {
    safeRouterBack(router);
  }, [router]);

  const closeButtonStyle = useMemo(
    () => [
      styles.closeButton,
      { top: insets.top },
      isRTL ? { left: spacing.lg, right: undefined } : { right: spacing.lg, left: undefined },
    ],
    [styles.closeButton, insets.top, isRTL]
  );

  const loadOffering = useCallback(async () => {
    if (Platform.OS === "web") {
      setLoading(false);
      return;
    }
    if (!isRevenueCatApiKeySet()) {
      setError(t("subscriptionNotConfigured"));
      setLoading(false);
      void trackEvent("paywall_fallback");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const offerings = await Purchases.getOfferings();
      const pkg = pickSubscriptionPackage(offerings);
      if (!pkg) {
        setError(t("noOfferingFound"));
        setPackageToBuy(null);
        void trackEvent("paywall_fallback");
        return;
      }
      setPackageToBuy(pkg);
    } catch {
      setError(t("couldNotLoadOfferings"));
      void trackEvent("paywall_fallback");
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    void trackEvent("paywall_opened");
    void loadOffering();
  }, [loadOffering]);

  const onSubscribe = useCallback(async () => {
    if (Platform.OS === "web" || !packageToBuy) {
      return;
    }
    setBusy("purchase");
    try {
      await Purchases.purchasePackage(packageToBuy);
      await refresh();
      void trackEvent("paywall_purchase");
      setShowPurchaseSuccessAlert(true);
    } catch (e: unknown) {
      const code = e && typeof e === "object" && "code" in e ? (e as { code?: string }).code : undefined;
      if (code === PURCHASES_ERROR_CODE.PURCHASE_CANCELLED_ERROR) {
        // User cancelled, stay on screen
      } else {
        setShowPurchaseFailedAlert(true);
      }
    } finally {
      setBusy(null);
    }
  }, [packageToBuy, refresh, router]);

  const onRestore = useCallback(async () => {
    if (Platform.OS === "web") {
      return;
    }
    setBusy("restore");
    try {
      await Purchases.restorePurchases();
      await refresh();
      void trackEvent("paywall_restore");
      setShowRestoreSuccessAlert(true);
    } catch {
      const storeLabel = Platform.OS === "android" ? t("googleAccount") : t("appleId");
      setRestoreFailedMessage(t("noPurchasesForAccount", { account: storeLabel }));
      setShowRestoreFailedAlert(true);
    } finally {
      setBusy(null);
    }
  }, [refresh, t]);

  const renderPurchaseActions = (): ReactNode => {
    if (loading) {
      return (
        <View style={styles.blockCompact}>
          <ActivityIndicator size="large" color={colors.accent} />
          <Text style={styles.hint}>{t("loading")}</Text>
        </View>
      );
    }
    if (error) {
      return (
        <View style={styles.blockCompact}>
          <Text style={styles.errorText}>{error}</Text>
          <Pressable
            onPress={() => void loadOffering()}
            style={({ pressed }) => [styles.linkBtn, pressed && styles.pressed]}
          >
            <Text style={styles.linkBtnText}>{t("tryAgain")}</Text>
          </Pressable>
        </View>
      );
    }
    if (!packageToBuy) {
      return null;
    }
    return (
      <>
        {hasTrial ? (
          <View style={styles.freeTrialBlock}>
            <Text style={styles.freeTrialLabel}>{t("freeTrialLabel")}</Text>
            <Text style={styles.freeTrialFinePrint}>{t("freeTrialFinePrint")}</Text>
          </View>
        ) : null}
        <Pressable
          onPress={() => void onSubscribe()}
          disabled={busy !== null}
          style={({ pressed }) => [styles.ctaFull, pressed && styles.pressed, busy !== null && styles.disabled]}
        >
          {busy === "purchase" ? (
            <ActivityIndicator color={colors.pillActiveText} />
          ) : (
            <Text style={styles.ctaFullText}>{t("unlockNudgrr")}</Text>
          )}
        </Pressable>
        <Pressable
          onPress={() => void onRestore()}
          disabled={busy !== null}
          style={({ pressed }) => [styles.restoreLink, pressed && styles.pressed]}
        >
          {busy === "restore" ? (
            <ActivityIndicator color={colors.textSecondary} />
          ) : (
            <Text style={styles.restoreLinkText}>{t("restorePurchases")}</Text>
          )}
        </Pressable>
      </>
    );
  };

  if (Platform.OS === "web") {
    const openAppStore = () => {
      void Linking.openURL(getAppStoreUrl());
      void trackEvent("paywall_web_store_link");
    };

    return (
      <View style={[styles.screen, styles.webPaywallRoot, { paddingTop: insets.top }]}>
        <StatusBar style={isDark ? "light" : "dark"} />
        <Pressable
          onPress={close}
          accessibilityRole="button"
          accessibilityLabel={t("close")}
          style={closeButtonStyle}
        >
          <Text style={styles.closeMark}>✕</Text>
        </Pressable>
        <ScrollView
          style={styles.webPaywallScroll}
          contentContainerStyle={[
            styles.scroll,
            styles.webScrollContent,
            { paddingBottom: insets.bottom + spacing.xl },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.contentBlock}>
            <PaywallHero
              styles={styles}
              title={t("nudgrrUnlimited")}
              subtitle={t("getTheFullExperience")}
            />
            <PaywallFeatureList styles={styles} labels={featureLabels} isRTL={isRTL} />
            <Pressable
              onPress={openAppStore}
              style={({ pressed }) => [styles.ctaFull, pressed && styles.pressed]}
              accessibilityRole="link"
              accessibilityLabel={t("unlockNudgrr")}
            >
              <Text style={styles.ctaFullText}>{t("unlockNudgrr")}</Text>
            </Pressable>
            <Text style={styles.paywallLegal}>{t("subscriptionAvailableMobile")}</Text>
          </View>
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <StatusBar style={isDark ? "light" : "dark"} />
      <Pressable
        onPress={close}
        accessibilityRole="button"
        accessibilityLabel={t("close")}
        style={closeButtonStyle}
      >
        <Text style={styles.closeMark}>✕</Text>
      </Pressable>
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          styles.scrollContent,
          { paddingBottom: insets.bottom + spacing.xl },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.contentBlock}>
          <PaywallHero
            styles={styles}
            title={t("nudgrrUnlimited")}
            subtitle={t("getTheFullExperience")}
          />
          <PaywallFeatureList styles={styles} labels={featureLabels} isRTL={isRTL} />
          {!loading && !error && packageToBuy ? (
            <PaywallPriceBlock
              styles={styles}
              subscriptionLabel={t("oneMonthSubscription")}
              price={priceLabel}
            />
          ) : null}
          {renderPurchaseActions()}
          <PaywallLegalFooter
            styles={styles}
            isRTL={isRTL}
            legalText={
              Platform.OS === "ios" ? t("paywallSubscriptionLegalIos") : t("paywallSubscriptionLegalAndroid")
            }
            onPrivacy={() => setLegalModal("privacy")}
            onTerms={() => setLegalModal("terms")}
            privacyLabel={t("privacyPolicy")}
            termsLabel={t("termsOfUse")}
          />
        </View>
      </ScrollView>
      <Modal
        visible={legalModal !== null}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={() => setLegalModal(null)}
      >
        <View style={[styles.legalModalScreen, { paddingTop: insets.top }]}>
          <StatusBar style={isDark ? "light" : "dark"} />
          <View style={[styles.legalModalHeader, rtlRow(isRTL)]}>
            <Pressable
              onPress={() => setLegalModal(null)}
              hitSlop={12}
              style={({ pressed }) => [styles.legalModalBack, pressed && styles.legalModalPressed]}
            >
              <Text style={styles.legalModalBackText}>{t("close")}</Text>
            </Pressable>
            <Text style={styles.legalModalTitle}>
              {legalModal === "terms" ? t("termsOfUse") : t("privacyPolicy")}
            </Text>
            <View style={styles.legalModalHeaderSpacer} />
          </View>
          <ScrollView
            style={styles.legalModalScroll}
            contentContainerStyle={[
              styles.legalModalContent,
              { paddingBottom: insets.bottom + spacing.xl },
            ]}
            showsVerticalScrollIndicator
          >
            {legalModal === "terms" ? (
              <Text style={styles.legalModalBody}>
                {t("paywallTermsEulaIntro")}
                <Text
                  style={styles.legalModalBodyLink}
                  onPress={() => void Linking.openURL(APPLE_EULA_URL)}
                >
                  {APPLE_EULA_URL}
                </Text>
              </Text>
            ) : (
              <Text style={styles.legalModalBody}>{PRIVACY_POLICY_BODY}</Text>
            )}
          </ScrollView>
        </View>
      </Modal>
      <AppAlert
        visible={showPurchaseSuccessAlert}
        title={t("youreIn")}
        message={t("unlimitedActiveEnjoy")}
        onRequestClose={() => setShowPurchaseSuccessAlert(false)}
        buttons={[
          {
            text: t("ok"),
            onPress: () => {
              setShowPurchaseSuccessAlert(false);
              safeRouterBack(router);
            },
          },
        ]}
      />
      <AppAlert
        visible={showPurchaseFailedAlert}
        title={t("somethingWentWrong")}
        message={t("purchaseFailedBody")}
        onRequestClose={() => setShowPurchaseFailedAlert(false)}
        buttons={[{ text: t("ok"), onPress: () => setShowPurchaseFailedAlert(false) }]}
      />
      <AppAlert
        visible={showRestoreSuccessAlert}
        title={t("restored")}
        message={t("unlimitedBackOn")}
        onRequestClose={() => setShowRestoreSuccessAlert(false)}
        buttons={[
          {
            text: t("ok"),
            onPress: () => {
              setShowRestoreSuccessAlert(false);
              safeRouterBack(router);
            },
          },
        ]}
      />
      <AppAlert
        visible={showRestoreFailedAlert}
        title={t("couldntRestore")}
        message={restoreFailedMessage}
        onRequestClose={() => setShowRestoreFailedAlert(false)}
        buttons={[{ text: t("ok"), onPress: () => setShowRestoreFailedAlert(false) }]}
      />
    </View>
  );
}

function createStyles(colors: AppColors) {
  const accentMuted = `${colors.accent}22`;

  return StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: colors.background,
    },
    scroll: {
      paddingHorizontal: spacing.lg,
    },
    scrollContent: {
      flexGrow: 1,
      justifyContent: "center",
      paddingTop: spacing.xxl,
    },
    webPaywallRoot: {
      flex: 1,
    },
    webPaywallScroll: {
      flex: 1,
    },
    webScrollContent: {
      flexGrow: 1,
      justifyContent: "center",
    },
    contentBlock: {
      width: "100%",
      maxWidth: 420,
      alignSelf: "center",
      gap: spacing.lg,
    },
    closeButton: {
      position: "absolute",
      zIndex: 2,
      minWidth: 44,
      minHeight: 44,
      justifyContent: "center",
      alignItems: "center",
    },
    closeMark: {
      ...typography.resultSecondary,
      color: colors.accent,
      fontSize: 22,
    },
    heroSection: {
      alignItems: "center",
      gap: spacing.md,
      marginBottom: spacing.xs,
    },
    heroFrame: {
      width: "100%",
      borderWidth: 2,
      borderColor: colors.accent,
      borderRadius: radii.lg,
      paddingVertical: spacing.xl,
      paddingHorizontal: spacing.lg,
      backgroundColor: accentMuted,
      alignItems: "center",
      justifyContent: "center",
    },
    heroTitle: {
      ...typography.resultPrimary,
      fontSize: 32,
      lineHeight: 38,
      color: colors.textPrimary,
      textAlign: "center",
    },
    heroSubtitle: {
      ...typography.label,
      color: colors.accent,
      textAlign: "center",
    },
    featureCard: {
      width: "100%",
      gap: spacing.sm,
      paddingVertical: spacing.sm,
    },
    featureRow: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: spacing.sm,
    },
    featureCheck: {
      fontFamily: fonts.mono,
      fontSize: 18,
      lineHeight: 24,
      color: colors.accent,
      minWidth: 22,
      textAlign: "center",
    },
    featureText: {
      ...typography.body,
      flex: 1,
      fontFamily: fonts.bodySemiBold,
      color: colors.textPrimary,
      lineHeight: 24,
      textAlign: "left",
    },
    featureTextRtl: {
      textAlign: "right",
    },
    priceBlock: {
      width: "100%",
      alignItems: "center",
      gap: spacing.xs,
      paddingVertical: spacing.lg,
      paddingHorizontal: spacing.md,
      borderWidth: 2,
      borderColor: colors.accent,
      borderRadius: radii.lg,
      backgroundColor: accentMuted,
    },
    subscriptionLength: {
      ...typography.label,
      color: colors.accent,
      textAlign: "center",
    },
    price: {
      fontFamily: fonts.mono,
      fontSize: 40,
      lineHeight: 46,
      letterSpacing: -1,
      color: colors.accent,
      textAlign: "center",
    },
    freeTrialBlock: {
      marginTop: spacing.xs,
      paddingHorizontal: spacing.sm,
      gap: 6,
    },
    freeTrialLabel: {
      ...typography.body,
      fontFamily: fonts.bodySemiBold,
      color: colors.accent,
      textAlign: "center",
    },
    freeTrialFinePrint: {
      ...typography.badge,
      fontSize: 11,
      lineHeight: 15,
      color: colors.textSecondary,
      textAlign: "center",
      opacity: 0.92,
    },
    blockCompact: {
      gap: spacing.md,
      alignItems: "center",
      marginVertical: spacing.sm,
    },
    hint: {
      ...typography.badge,
      color: colors.textSecondary,
      textAlign: "center",
    },
    errorText: {
      ...typography.body,
      color: colors.textPrimary,
      textAlign: "center",
    },
    linkBtn: {
      paddingVertical: spacing.sm,
    },
    linkBtnText: {
      ...typography.body,
      color: colors.accent,
      fontFamily: fonts.bodySemiBold,
    },
    ctaFull: {
      width: "100%",
      minHeight: touchTarget.min,
      borderRadius: radii.pill,
      backgroundColor: colors.accent,
      alignItems: "center",
      justifyContent: "center",
      marginTop: spacing.xs,
    },
    ctaFullText: {
      ...typography.body,
      fontFamily: fonts.bodySemiBold,
      color: colors.pillActiveText,
      fontSize: 16,
      letterSpacing: 0.2,
    },
    restoreLink: {
      alignSelf: "center",
      paddingVertical: spacing.md,
      minHeight: 44,
      justifyContent: "center",
    },
    restoreLinkText: {
      ...typography.badge,
      color: colors.textSecondary,
      textDecorationLine: "underline",
    },
    paywallLegal: {
      ...typography.badge,
      color: colors.textSecondary,
      textAlign: "center",
      opacity: 0.88,
      marginTop: spacing.sm,
      paddingHorizontal: spacing.sm,
    },
    paywallLegalLinksRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: spacing.sm,
    },
    paywallLegalLink: {
      ...typography.badge,
      color: colors.accent,
      textDecorationLine: "underline",
    },
    paywallLegalLinkSeparator: {
      ...typography.badge,
      color: colors.textSecondary,
    },
    legalModalScreen: {
      flex: 1,
      backgroundColor: colors.background,
    },
    legalModalHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: spacing.lg,
      minHeight: touchTarget.min,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
    },
    legalModalBack: { minWidth: 56, minHeight: 44, justifyContent: "center" },
    legalModalBackText: { ...typography.body, color: colors.accent, fontWeight: "700" },
    legalModalTitle: {
      ...typography.body,
      fontFamily: fonts.bodyBold,
      color: colors.textPrimary,
      flex: 1,
      textAlign: "center",
    },
    legalModalHeaderSpacer: { minWidth: 56 },
    legalModalScroll: { flex: 1 },
    legalModalContent: { paddingHorizontal: spacing.lg, paddingTop: spacing.md },
    legalModalBody: {
      ...typography.badge,
      color: colors.textPrimary,
    },
    legalModalBodyLink: {
      ...typography.badge,
      color: colors.accent,
      textDecorationLine: "underline",
    },
    legalModalPressed: { opacity: 0.86 },
    pressed: {
      opacity: 0.88,
    },
    disabled: {
      opacity: 0.65,
    },
  });
}
