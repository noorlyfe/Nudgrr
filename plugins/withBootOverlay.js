const { withAppDelegate, withDangerousMod } = require("@expo/config-plugins");
const fs = require("fs");
const path = require("path");
const splash = require("../constants/splashTypography");

const BOOT_OVERLAY_SWIFT = `import UIKit

private enum SplashTypography {
  static let designWidth: CGFloat = ${splash.designWidth}
  static let wordmarkSize: CGFloat = ${splash.wordmarkSize}
  static let wordmarkKern: CGFloat = ${splash.wordmarkKern}
  static let taglineSize: CGFloat = ${splash.taglineSize}
  static let taglineKern: CGFloat = ${splash.taglineKern}
  static let accent = UIColor(red: 0.8509803921568627, green: 0.6470588235294118, blue: 0.16862745098039217, alpha: 1)
}

private func splashScale(for view: UIView) -> CGFloat {
  let width = view.bounds.width > 0 ? view.bounds.width : UIScreen.main.bounds.width
  return max(width / SplashTypography.designWidth, 0.01)
}

private func applyKernedText(
  _ label: UILabel,
  text: String,
  fontName: String,
  size: CGFloat,
  kern: CGFloat,
  color: UIColor
) {
  let font = UIFont(name: fontName, size: size) ?? UIFont.systemFont(ofSize: size, weight: .bold)
  label.attributedText = NSAttributedString(
    string: text,
    attributes: [
      .font: font,
      .kern: kern,
      .foregroundColor: color,
    ]
  )
}

final class BootOverlayViewController: UIViewController {
  private let holdMs: Int
  private let exitMs: Int
  private let onFinish: () -> Void
  private let startDate = Date()
  private var finished = false

  init(holdMs: Int, exitMs: Int, onFinish: @escaping () -> Void) {
    self.holdMs = holdMs
    self.exitMs = exitMs
    self.onFinish = onFinish
    super.init(nibName: nil, bundle: nil)
  }

  required init?(coder: NSCoder) { fatalError("init(coder:) has not been implemented") }

  override func viewDidLoad() {
    super.viewDidLoad()
    view.isUserInteractionEnabled = false
    view.backgroundColor = UIColor(red: 0.10196078431372549, green: 0.09019607843137255, blue: 0.06274509803921569, alpha: 1)
    let scale = splashScale(for: view)
    let imageView = UIImageView(image: UIImage(named: "SplashLogo"))
    imageView.contentMode = .scaleAspectFit
    imageView.translatesAutoresizingMaskIntoConstraints = false
    NSLayoutConstraint.activate([
      imageView.widthAnchor.constraint(equalToConstant: 80),
      imageView.heightAnchor.constraint(equalToConstant: 80),
    ])
    let title = UILabel()
    title.textAlignment = .center
    applyKernedText(
      title,
      text: "${splash.titleText}",
      fontName: "${splash.wordmarkFont}",
      size: SplashTypography.wordmarkSize * scale,
      kern: SplashTypography.wordmarkKern * scale,
      color: SplashTypography.accent
    )
    let line = UIView()
    line.translatesAutoresizingMaskIntoConstraints = false
    line.backgroundColor = UIColor(red: 0.7882, green: 0.5922, blue: 0.2275, alpha: 1)
    line.layer.cornerRadius = 0.75
    NSLayoutConstraint.activate([
      line.widthAnchor.constraint(equalToConstant: 60),
      line.heightAnchor.constraint(equalToConstant: 1.5),
    ])
    let tagline = UILabel()
    tagline.textAlignment = .center
    tagline.numberOfLines = 0
    applyKernedText(
      tagline,
      text: "${splash.taglineText}",
      fontName: "${splash.taglineFont}",
      size: SplashTypography.taglineSize * scale,
      kern: SplashTypography.taglineKern * scale,
      color: SplashTypography.accent
    )
    let textStack = UIStackView()
    textStack.axis = .vertical
    textStack.alignment = .center
    textStack.distribution = .fill
    textStack.spacing = 16
    textStack.translatesAutoresizingMaskIntoConstraints = false
    textStack.addArrangedSubview(title)
    textStack.addArrangedSubview(line)
    textStack.addArrangedSubview(tagline)
    view.addSubview(imageView)
    view.addSubview(textStack)
    NSLayoutConstraint.activate([
      textStack.centerXAnchor.constraint(equalTo: view.centerXAnchor),
      textStack.centerYAnchor.constraint(equalTo: view.centerYAnchor),
      textStack.leadingAnchor.constraint(greaterThanOrEqualTo: view.leadingAnchor, constant: 24),
      textStack.trailingAnchor.constraint(lessThanOrEqualTo: view.trailingAnchor, constant: -24),
      imageView.centerXAnchor.constraint(equalTo: view.centerXAnchor),
      imageView.bottomAnchor.constraint(equalTo: textStack.topAnchor, constant: -16),
    ])
  }

  func markReactContentDidAppear() { attemptFinishIfReady() }

  private func attemptFinishIfReady() {
    guard !finished else { return }
    let elapsedMs = Int(Date().timeIntervalSince(startDate) * 1000)
    let remainingHold = max(0, holdMs - elapsedMs)
    if remainingHold > 0 {
      DispatchQueue.main.asyncAfter(deadline: .now() + .milliseconds(remainingHold)) { [weak self] in
        self?.attemptFinishIfReady()
      }
      return
    }
    finished = true
    animateExit()
  }

  private func animateExit() {
    UIView.animate(
      withDuration: Double(exitMs) / 1000.0,
      delay: 0,
      options: [.curveEaseOut, .beginFromCurrentState],
      animations: { self.view.transform = CGAffineTransform(translationX: 0, y: -self.view.bounds.height) },
      completion: { _ in self.onFinish() }
    )
  }
}
`;

const APP_DELEGATE_BOOT_OVERLAY = `
    // Boot overlay
    if let window = window {
      let overlay = BootOverlayViewController(holdMs: 1200, exitMs: 400) { [weak window] in
        window?.rootViewController?.view.isUserInteractionEnabled = true
      }
      window.rootViewController?.view.isUserInteractionEnabled = false
      window.rootViewController?.addChild(overlay)
      window.rootViewController?.view.addSubview(overlay.view)
      overlay.view.frame = window.bounds
      overlay.didMove(toParent: window.rootViewController)
      DispatchQueue.main.asyncAfter(deadline: .now() + 0.1) {
        overlay.markReactContentDidAppear()
      }
    }`;

const BOOT_OVERLAY_FILE_REF = "E8B4A1F22D0307B50044C1D9";
const BOOT_OVERLAY_BUILD_FILE = "E8B4A1F32D0307B50044C1D9";

/** Xcode only compiles .swift files listed in project.pbxproj — writing the file is not enough. */
function ensureBootOverlayInXcodeProject(projectRoot) {
  const pbxprojPath = path.join(projectRoot, "ios", "Nudgrr.xcodeproj", "project.pbxproj");
  if (!fs.existsSync(pbxprojPath)) return;

  let pbx = fs.readFileSync(pbxprojPath, "utf8");
  if (pbx.includes("BootOverlayViewController.swift in Sources")) return;

  const buildFile = `\t\t${BOOT_OVERLAY_BUILD_FILE} /* BootOverlayViewController.swift in Sources */ = {isa = PBXBuildFile; fileRef = ${BOOT_OVERLAY_FILE_REF} /* BootOverlayViewController.swift */; };`;
  const fileRef = `\t\t${BOOT_OVERLAY_FILE_REF} /* BootOverlayViewController.swift */ = {isa = PBXFileReference; lastKnownFileType = sourcecode.swift; name = BootOverlayViewController.swift; path = Nudgrr/BootOverlayViewController.swift; sourceTree = "<group>"; };`;
  const groupChild = `\t\t\t\t${BOOT_OVERLAY_FILE_REF} /* BootOverlayViewController.swift */,`;
  const sourcesEntry = `\t\t\t\t${BOOT_OVERLAY_BUILD_FILE} /* BootOverlayViewController.swift in Sources */,`;

  pbx = pbx.replace(
    "/* End PBXBuildFile section */",
    `${buildFile}\n/* End PBXBuildFile section */`
  );
  pbx = pbx.replace(
    /(\/\* AppDelegate\.swift \*\/ = \{isa = PBXFileReference;[\s\S]*?sourceTree = "<group>"; \};)/,
    `$1\n${fileRef}`
  );
  pbx = pbx.replace(
    /(\/\* AppDelegate\.swift \*\/,)\n(\t\t\t\t\/\* Nudgrr-Bridging-Header\.h \*\/,)/,
    `$1\n${groupChild}\n$2`
  );
  pbx = pbx.replace(
    /(\/\* AppDelegate\.swift in Sources \*\/,)\n(\t\t\t\t9FB15666F614092762C51F84)/,
    `$1\n${sourcesEntry}\n\t\t\t\t$2`
  );

  fs.writeFileSync(pbxprojPath, pbx, "utf8");
  console.log("✅ BootOverlayViewController.swift added to Xcode Compile Sources");
}

const withBootOverlaySwift = (config) => {
  return withDangerousMod(config, [
    "ios",
    async (config) => {
      const projectRoot = config.modRequest.projectRoot;
      const iosDir = path.join(projectRoot, "ios", "Nudgrr");
      const swiftFile = path.join(iosDir, "BootOverlayViewController.swift");
      fs.writeFileSync(swiftFile, BOOT_OVERLAY_SWIFT, "utf8");
      console.log("✅ BootOverlayViewController.swift written");
      ensureBootOverlayInXcodeProject(projectRoot);

      const storyboardPath = path.join(iosDir, "SplashScreen.storyboard");
      if (fs.existsSync(storyboardPath)) {
        let storyboard = fs.readFileSync(storyboardPath, "utf8");
        storyboard = storyboard.replace(
          '<color key="backgroundColor" systemColor="systemBackgroundColor"/>',
          '<color key="backgroundColor" red="0.8863" green="0.8471" blue="0.7843" alpha="1" colorSpace="custom" customColorSpace="sRGB"/>'
        );
        storyboard = storyboard.replace(
          /<systemColor name="systemBackgroundColor">[\s\S]*?<\/systemColor>/,
          ""
        );
        fs.writeFileSync(storyboardPath, storyboard, "utf8");
        console.log("✅ SplashScreen.storyboard background color fixed");
      }

      return config;
    },
  ]);
};

const withBootOverlayAppDelegate = (config) => {
  return withAppDelegate(config, (config) => {
    const contents = config.modResults.contents;
    if (contents.includes("BootOverlayViewController")) {
      return config;
    }
    const insertAfter = `factory.startReactNative(\n      withModuleName: "main",\n      in: window,\n      launchOptions: launchOptions)`;
    if (contents.includes(insertAfter)) {
      config.modResults.contents = contents.replace(
        insertAfter,
        insertAfter + "\n" + APP_DELEGATE_BOOT_OVERLAY
      );
      console.log("✅ BootOverlay injected into AppDelegate");
    } else {
      console.warn("⚠️ Could not find insertion point in AppDelegate");
    }
    return config;
  });
};

const withBootOverlay = (config) => {
  config = withBootOverlaySwift(config);
  config = withBootOverlayAppDelegate(config);
  return config;
};

module.exports = withBootOverlay;
