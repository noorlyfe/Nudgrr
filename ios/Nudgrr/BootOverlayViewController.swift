import UIKit

private enum SplashTypography {
  static let designWidth: CGFloat = 1242
  static let wordmarkSize: CGFloat = 112
  static let wordmarkKern: CGFloat = -4
  static let taglineSize: CGFloat = 26
  static let taglineKern: CGFloat = 3.8
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
      text: "Nudgrr",
      fontName: "Inter-Bold",
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
      text: "TAKE THE AWKWARD OUT OF ASKING",
      fontName: "Inter-SemiBold",
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
