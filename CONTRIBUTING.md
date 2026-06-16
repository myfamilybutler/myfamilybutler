# Contributing to MyFamilyButler 🏠

Thank you for your interest in contributing to MyFamilyButler! Community contributions help make this project more reliable, fast, and accessible to busy families worldwide.

---

## Code of Conduct

By participating in this project, you agree to maintain a respectful, welcoming, and collaborative environment for all contributors.

---

## How to Contribute

### 1. Reporting Bugs & Proposing Features
* Search the existing [GitHub Issues](https://github.com/myfamilybutler/myfamilybutler/issues) to verify if the issue or feature request has already been reported.
* If not, open a new issue describing:
  * What you expected to happen vs. what actually happened.
  * Step-by-step reproduction instructions.
  * Relevant logs or screenshots.

### 2. Submitting Pull Requests (PRs)
To keep the project stable and ensure security:
1. **Fork the repository** to your personal GitHub account.
2. **Create a new branch** for your feature or bug fix:
   ```bash
   git checkout -b feat/your-feature-name
   ```
3. **Commit your changes** with a clear commit message.
4. **Push the branch** to your fork:
   ```bash
   git push origin feat/your-feature-name
   ```
5. **Open a Pull Request** against the `main` branch of the official `myfamilybutler/myfamilybutler` repository.

---

## Pull Request Guidelines

Before your PR can be merged, it must satisfy the following criteria:

* **Code Quality**: Run `npm run lint` and verify there are no ESLint errors.
* **Testing**: Run `npm test` and ensure all test cases pass. If you are adding new features, include corresponding test files.
* **No Hardcoded Secrets**: Make sure absolutely no API keys, developer tokens, or passwords are committed to the code.
* **Documentation**: If your changes introduce new environment variables, verify they are documented in both `.env.local.example` and the `README.md`.
