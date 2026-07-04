# SwiftUI Calculator Implementation Plan

- **Plan ID:** swiftui-calculator
- **Project:** swiftui-calculator
- **Status:** planned
- **Schema Version:** 1

## Summary

Build a polished calculator app in Swift using SwiftUI, with a small calculation engine separated from the view layer so arithmetic behavior can be tested without UI automation.

The plan starts with project structure and core expression behavior, then builds the visual calculator surface, input handling, memory features, history, accessibility, persistence, and release readiness.

The app should feel native on iPhone and iPad, support portrait and landscape layouts, and preserve predictable calculator behavior for common numeric edge cases.

## Metadata

- **architecture:** SwiftUI views backed by a tested calculator engine
- **language:** Swift
- **minimumTarget:** iOS 17
- **platforms:** iOS
- **uiFramework:** SwiftUI

## Epics

### E1: Project Foundation

Create the SwiftUI app skeleton, module boundaries, and basic test setup.
- **Tags:** foundation

#### Stories

##### E1.S1: Create SwiftUI App Target

**Details:**

- Create a SwiftUI app target with a single main calculator scene.
- Set the deployment target and app metadata.
- Add separate folders or groups for engine, view model, views, persistence, and tests.

**Acceptance Criteria:**

- The app launches to an empty calculator shell without runtime warnings.
- The project has a clear separation between UI and calculation logic.
- The test target can run at least one placeholder unit test.

**Unit Tests:**

- Run the default unit test target successfully.

**Files Likely Touched:**

- `CalculatorApp.swift`
- `CalculatorView.swift`

##### E1.S2: Define Core Domain Types

**Details:**

- Define types for calculator buttons, operations, input events, display state, and calculation errors.
- Keep the domain types independent from SwiftUI.

**Acceptance Criteria:**

- Domain types compile without importing SwiftUI.
- Every visible keypad button maps to a typed input event.
- Errors have stable typed cases instead of display strings only.

**Unit Tests:**

- Test that all button definitions map to valid input events.

### E2: Calculator Engine

Implement the arithmetic state machine and the core behavior expected from a basic calculator.
- **Tags:** engine, test-heavy

#### Stories

##### E2.S1: Implement Digit and Decimal Input

**Details:**

- Support appending digits to the current operand.
- Support a single decimal separator per operand.
- Support leading zero and replacement behavior after operations.

**Acceptance Criteria:**

- Entering digits updates the current display predictably.
- Entering multiple decimal separators does not corrupt the operand.
- Starting a new operand after an operator replaces the display instead of appending.

**Unit Tests:**

- Test multi-digit input.
- Test decimal input rejects a second decimal separator.
- Test new operand entry after selecting an operator.

##### E2.S2: Implement Binary Operators
- **Dependencies:** E2.S1

**Details:**

- Support addition, subtraction, multiplication, and division.
- Store pending operator state until equals or another operator is pressed.
- Handle operator replacement when the user taps operators repeatedly.

**Acceptance Criteria:**

- Basic binary operations produce correct results.
- Repeated operator taps replace the pending operator.
- Pressing an operator after entering a second operand evaluates the prior operation.

**Unit Tests:**

- Test addition, subtraction, multiplication, and division.
- Test chained operator behavior.
- Test operator replacement behavior.

##### E2.S3: Implement Unary Operators
- **Dependencies:** E2.S1

**Details:**

- Support sign toggle, percent, and clear-entry behavior.
- Apply unary operations to the currently editable operand.

**Acceptance Criteria:**

- Sign toggle flips positive and negative values.
- Percent behavior is documented and consistent.
- Clear-entry resets the current operand without losing unrelated persistent state.

**Unit Tests:**

- Test sign toggle for positive, negative, and zero values.
- Test percent behavior for standalone and pending-operation cases.
- Test clear-entry behavior.

##### E2.S4: Implement Equals and Repeated Equals
- **Dependencies:** E2.S2

**Details:**

- Evaluate the pending operation when equals is pressed.
- Remember the last operation so repeated equals repeats the last calculation.

**Acceptance Criteria:**

- Equals computes the displayed result.
- Repeated equals applies the last operand and operator again.
- Equals with no pending operation is harmless.

**Unit Tests:**

- Test equals after a binary operation.
- Test repeated equals for addition and multiplication.
- Test equals with no pending operation.

##### E2.S5: Handle Numeric Errors
- **Dependencies:** E2.S2

**Details:**

- Represent divide-by-zero, overflow, and invalid decimal states as typed errors.
- Reset error state only when the user starts a clear or new valid calculation.

**Acceptance Criteria:**

- Divide-by-zero shows an error state instead of crashing.
- Overflow is detected before displaying misleading results.
- After an error, clear returns the engine to a usable initial state.

**Unit Tests:**

- Test divide-by-zero error state.
- Test clear after error.
- Test large-number overflow handling.

### E3: Display Formatting

Convert engine state into concise, readable display strings.

#### Stories

##### E3.S1: Format Standard Results
- **Dependencies:** E2.S1

**Details:**

- Create a formatter for integers, decimals, negative values, and trailing zeros.
- Keep formatter behavior deterministic across locales unless locale-specific display is explicitly enabled.

**Acceptance Criteria:**

- Whole-number results do not show unnecessary decimal suffixes.
- Decimal results are rounded to fit the display.
- Negative values preserve the sign and remain readable.

**Unit Tests:**

- Test integer formatting.
- Test decimal rounding.
- Test negative number formatting.

##### E3.S2: Format Scientific Notation
- **Dependencies:** E3.S1

**Details:**

- Use scientific notation when values exceed display capacity.
- Ensure very small non-zero values remain distinguishable from zero.

**Acceptance Criteria:**

- Large values switch to scientific notation.
- Small values do not silently round to zero when precision remains meaningful.
- Scientific notation fits the display area.

**Unit Tests:**

- Test large-value scientific notation.
- Test small-value scientific notation.
- Test display length constraints.

##### E3.S3: Format Error Messages
- **Dependencies:** E2.S5

**Details:**

- Map typed engine errors to short user-facing display strings.
- Keep raw error types available for tests and accessibility.

**Acceptance Criteria:**

- Every engine error has a display string.
- Error display strings fit in the calculator display.
- Error state can be announced through accessibility labels.

**Unit Tests:**

- Test every error case maps to a display string.
- Test unknown errors cannot appear without a fallback.

### E4: SwiftUI Calculator Layout

Build the native visual surface: display, keypad grid, spacing, and adaptive layout.
- **Tags:** ui

#### Stories

##### E4.S1: Build Display View
- **Dependencies:** E3.S1

**Details:**

- Create a calculator display with right-aligned text, dynamic sizing, and safe truncation.
- Support a secondary expression or status line when useful.

**Acceptance Criteria:**

- Display text never overlaps the keypad.
- Long values shrink or switch format rather than clipping awkwardly.
- The display supports light and dark mode.

**Unit Tests:**

- Add a preview or snapshot-style manual check for short, long, and error displays.

##### E4.S2: Build Keypad Grid
- **Dependencies:** E1.S2

**Details:**

- Create reusable calculator button views.
- Lay out digits, operators, clear, sign, percent, decimal, and equals in a stable grid.
- Make the zero button span the expected width if matching iOS calculator conventions.

**Acceptance Criteria:**

- All buttons have stable dimensions.
- The keypad remains usable on compact iPhone screens.
- Operator buttons are visually distinct from number buttons.

**Unit Tests:**

- Add SwiftUI previews for compact and regular size classes.

##### E4.S3: Support Orientation and iPad Layout
- **Dependencies:** E4.S1, E4.S2

**Details:**

- Adapt spacing, display height, and button sizes for portrait, landscape, and iPad.
- Avoid hardcoded dimensions that break on split view.

**Acceptance Criteria:**

- Portrait iPhone layout fits without scrolling.
- Landscape layout remains usable.
- iPad layout uses available space without oversized text.

**Unit Tests:**

- Manual smoke test previews for iPhone portrait, iPhone landscape, and iPad.

##### E4.S4: Add Theme Styling
- **Dependencies:** E4.S2

**Details:**

- Define color roles for display, numeric buttons, operator buttons, utility buttons, and background.
- Support system light and dark appearances.

**Acceptance Criteria:**

- Colors meet readable contrast in light and dark mode.
- Button pressed states are visible.
- Theme values are centralized rather than scattered through views.

**Unit Tests:**

- Manual preview check for light mode, dark mode, and high contrast.

### E5: View Model and Input Binding

Connect SwiftUI controls to the engine through a small observable view model.

#### Stories

##### E5.S1: Create Calculator View Model
- **Dependencies:** E2.S4, E3.S1

**Details:**

- Create an observable view model that owns a CalculatorEngine instance.
- Expose display text, secondary text, button state, and input dispatch methods.

**Acceptance Criteria:**

- Views do not mutate the engine directly.
- View model updates published state after every input.
- Display state is derived from engine state and formatter behavior.

**Unit Tests:**

- Test digit input updates display text.
- Test operator input updates secondary state if shown.
- Test clear resets published display state.

##### E5.S2: Wire Buttons to Input Events
- **Dependencies:** E4.S2, E5.S1

**Details:**

- Connect every keypad button to a typed input event.
- Add haptic feedback for successful button taps.

**Acceptance Criteria:**

- Every visible button performs the correct engine action.
- Disabled or invalid states do not send inconsistent input.
- Haptics do not fire for ignored actions when disabled.

**Unit Tests:**

- Test button definitions cover all input events.
- Manual smoke test every keypad button.

##### E5.S3: Add Keyboard Input for iPad
- **Dependencies:** E5.S2

**Details:**

- Support hardware keyboard digits, decimal, operators, enter, delete, and escape.
- Route keyboard input through the same view model dispatch path as button taps.

**Acceptance Criteria:**

- Hardware keyboard input works when the calculator scene is active.
- Keyboard and touch input produce identical engine behavior.
- Unsupported keys are ignored safely.

**Unit Tests:**

- Test keyboard event mapping to calculator input events.
- Manual smoke test on iPad simulator with hardware keyboard input.

### E6: Memory Functions

Add calculator memory controls and tested memory state transitions.

#### Stories

##### E6.S1: Implement Memory State in Engine
- **Dependencies:** E2.S1

**Details:**

- Support memory clear, memory recall, memory add, and memory subtract.
- Represent empty memory distinctly from zero if the UI needs to show memory availability.

**Acceptance Criteria:**

- Memory add and subtract update stored memory based on the current display value.
- Memory recall enters the stored value as the current operand.
- Memory clear removes stored memory state.

**Unit Tests:**

- Test memory add.
- Test memory subtract.
- Test memory recall.
- Test memory clear.

##### E6.S2: Add Memory Buttons to UI
- **Dependencies:** E6.S1, E5.S2

**Details:**

- Add memory controls in a compact row or adaptive menu depending on available screen size.
- Show memory availability without cluttering the main keypad.

**Acceptance Criteria:**

- Memory controls are reachable on compact iPhone screens.
- Memory controls remain visible or discoverable on iPad.
- Memory unavailable state is visually clear when appropriate.

**Unit Tests:**

- Manual preview check for compact and regular layouts.
- Manual smoke test memory controls through the UI.

### E7: History

Record recent calculations and expose a simple history view.

#### Stories

##### E7.S1: Capture Calculation History Entries
- **Dependencies:** E2.S4, E3.S1

**Details:**

- Record completed calculations with expression text, result text, timestamp, and error state if relevant.
- Avoid recording partial input sequences.

**Acceptance Criteria:**

- A history entry is created after a completed equals operation.
- Partial calculations are not added to history.
- Error results can be recorded or excluded according to a documented policy.

**Unit Tests:**

- Test history entry after equals.
- Test no history entry for partial input.
- Test history behavior for error results.

##### E7.S2: Build History Sheet
- **Dependencies:** E7.S1, E5.S1

**Details:**

- Create a SwiftUI sheet or panel showing recent calculations.
- Allow tapping a result to reuse it as the current operand.

**Acceptance Criteria:**

- History opens and closes without losing calculator state.
- History rows show expression and result clearly.
- Tapping a result loads it into the calculator through the view model.

**Unit Tests:**

- Manual smoke test opening history, selecting a row, and continuing calculation.

##### E7.S3: Clear History
- **Dependencies:** E7.S2

**Details:**

- Add an explicit clear history action with a confirmation step.
- Ensure clearing history does not clear the active calculator state.

**Acceptance Criteria:**

- Clear history removes all history entries.
- The current display remains unchanged after clearing history.
- The destructive action is confirmable.

**Unit Tests:**

- Test clear history removes entries.
- Test clear history preserves current display state.

### E8: Persistence and App Lifecycle

Persist lightweight state and restore the calculator when the app relaunches.

#### Stories

##### E8.S1: Persist Calculator State
- **Dependencies:** E5.S1, E7.S1

**Details:**

- Persist current display, pending operation, memory state, and recent history using a lightweight local store.
- Version the persisted payload so future changes can migrate safely.

**Acceptance Criteria:**

- Relaunch restores the last meaningful calculator state.
- Invalid persisted data falls back to a clean initial state.
- Persistence does not block the main thread during ordinary input.

**Unit Tests:**

- Test encode and decode of calculator state.
- Test invalid persisted payload fallback.
- Test missing version fallback.

##### E8.S2: Handle Scene Phase Changes
- **Dependencies:** E8.S1

**Details:**

- Save state when the app moves to background or becomes inactive.
- Restore state on launch before the first calculator view is rendered.

**Acceptance Criteria:**

- Backgrounding and reopening preserves state.
- Fresh install starts from a clean zero state.
- State restoration failures are non-fatal.

**Unit Tests:**

- Manual smoke test background and relaunch behavior.
- Test persistence service save and restore paths.

### E9: Accessibility and Localization

Make the calculator usable with VoiceOver, Dynamic Type, and localized display conventions.

#### Stories

##### E9.S1: Add Accessibility Labels
- **Dependencies:** E4.S2, E5.S2

**Details:**

- Add explicit accessibility labels and values for display, buttons, memory state, and history rows.
- Ensure symbols such as plus, minus, multiply, divide, and equals are announced clearly.

**Acceptance Criteria:**

- Every tappable control has a meaningful accessibility label.
- The display announces the current value or error state.
- VoiceOver order follows the visual calculator flow.

**Unit Tests:**

- Manual VoiceOver smoke test for entering and evaluating a calculation.

##### E9.S2: Support Dynamic Type
- **Dependencies:** E4.S1, E4.S2

**Details:**

- Make display and keypad text adapt to larger content sizes without overlap.
- Set sensible minimum scale factors for calculator display text.

**Acceptance Criteria:**

- Large accessibility text sizes remain usable.
- Button labels do not overlap or escape their bounds.
- The display remains readable with long values.

**Unit Tests:**

- Manual preview check with accessibility text sizes.

##### E9.S3: Prepare Localized Number Display
- **Dependencies:** E3.S1

**Details:**

- Decide whether decimal separator and grouping should follow locale.
- Keep parsing and display behavior consistent if localized separators are enabled.

**Acceptance Criteria:**

- Locale behavior is documented.
- Decimal input remains valid for the chosen locale policy.
- Tests cover at least one non-US decimal separator scenario if localization is enabled.

**Unit Tests:**

- Test formatter behavior under a locale with comma decimal separators if supported.

### E10: Quality, Release, and Polish

Finish verification, app polish, and release readiness.

#### Stories

##### E10.S1: Add End-to-End Smoke Tests
- **Dependencies:** E8.S2, E9.S1

**Details:**

- Create a small suite of UI or manual smoke tests for the most common calculator flows.
- Cover fresh launch, basic arithmetic, errors, memory, history, and state restore.

**Acceptance Criteria:**

- Smoke test checklist covers all core user-visible features.
- At least one automated UI test or documented manual test path exercises a full calculation.
- Release cannot be considered complete until the smoke checklist passes.

**Unit Tests:**

- Run unit tests for engine, formatter, view model, memory, history, and persistence.
- Run UI smoke test or manual release checklist.

##### E10.S2: Add App Icon and Launch Polish

**Details:**

- Add app icon assets.
- Confirm launch screen appearance is clean in light and dark mode.

**Acceptance Criteria:**

- App icon appears correctly on simulator home screen.
- Launch does not flash an inconsistent background.
- Asset catalog has no missing required icon warnings.

**Unit Tests:**

- Manual launch and home screen check on simulator.

##### E10.S3: Prepare Release Build
- **Dependencies:** E10.S1, E10.S2

**Details:**

- Create a release scheme or verify the default release configuration.
- Run archive build and inspect warnings.
- Document final verification commands and manual checks.

**Acceptance Criteria:**

- Release build succeeds without unexpected warnings.
- Archive can be produced locally.
- README or release notes include how to build and test the app.

**Unit Tests:**

- Run full unit test suite.
- Run archive build.

## Sections

### design-rules: Design Rules

- **Kind:** rules
- **Engine first:** Arithmetic, formatting, memory, and history behavior must live outside SwiftUI views.
- **Native interaction:** Buttons, gestures, haptics, dynamic type, and accessibility labels should follow iOS expectations.
- **Predictable numbers:** Decimal input, rounding, overflow, divide-by-zero, and repeated equals behavior must be explicitly specified and tested.

### core-architecture: Core Architecture

- **Kind:** architecture
| component | responsibility |
| --- | --- |
| CalculatorEngine | Owns numeric state, operators, expression evaluation, memory state, and error handling. |
| CalculatorViewModel | Adapts engine state to SwiftUI display strings, button enabled states, haptics, and persistence triggers. |
| CalculatorView | Renders display, keypad, history sheet, settings, and accessibility metadata. |

## Workflows

### validation-order: Validation Order

- **Kind:** validation

**Steps:**

1. Run engine and formatter unit tests first.
2. Run view model tests after input binding changes.
3. Run SwiftUI previews or simulator smoke checks for layout changes.
4. Run persistence and lifecycle tests after history and memory are connected.
5. Run accessibility, localization, and release smoke checks last.

## Commands

### Run Unit Tests

```sh
xcodebuild test -scheme Calculator -destination 'platform=iOS Simulator,name=iPhone 15'
```

**Expected Results:**

- All unit tests pass.

### Build Release Archive

```sh
xcodebuild archive -scheme Calculator -destination 'generic/platform=iOS'
```

**Expected Results:**

- Archive build completes without unexpected warnings.

## Recommended Order

1. **E1.S1**: The project target and test target must exist before any implementation work can be integrated.
1. **E1.S2**: Typed input and operation definitions keep the engine and UI aligned.
1. **E2.S1**: Digit and decimal input are the root behavior for all calculator operations.
1. **E2.S2**: Binary operators unlock the first useful calculation path.
1. **E2.S4**: Equals behavior completes the basic arithmetic loop.
1. **E3.S1**: Display formatting is needed before the UI can show stable values.
1. **E4.S1**: The display view is the first visible UI dependency.
1. **E4.S2**: The keypad provides the primary input surface.
1. **E5.S1**: The view model connects the tested engine to SwiftUI without leaking UI concerns into the engine.
1. **E5.S2**: Button wiring creates the first fully usable app slice.
1. **E2.S3**: Unary operations can be added once the main input loop is stable.
1. **E2.S5**: Error handling should be added before release-facing polish.
1. **E6.S1**: Memory behavior is engine state and should be tested before UI controls are added.
1. **E7.S1**: History capture depends on completed calculation events.
1. **E8.S1**: Persistence should be added after the state model includes calculator, memory, and history data.
1. **E9.S1**: Accessibility should be verified once the main controls and flows exist.
1. **E10.S1**: End-to-end smoke testing should validate the assembled feature set.
1. **E10.S3**: Release build verification should happen after core quality gates pass.
## Exit Criteria

- The app launches to a functional SwiftUI calculator on supported iOS simulators.
- Basic arithmetic, unary operations, repeated equals, memory, history, and clear behavior work through the UI.
- Engine, formatter, view model, memory, history, and persistence behavior are covered by tests or explicit smoke checks.
- The calculator remains usable in portrait, landscape, light mode, dark mode, larger text sizes, and VoiceOver smoke testing.
- A release archive build completes successfully.

