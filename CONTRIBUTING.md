# Contributing to Agent Identity Protocol (AIP)

Thank you for your interest in contributing to AIP! This project aims to be community-driven, and we welcome contributions of all kinds.

## Ways to Contribute

### 1. 💬 Participate in Discussions
- Share your use cases
- Propose new features
- Ask questions
- Help others in GitHub Discussions

### 2. 🐛 Report Issues
- Bug reports
- Documentation improvements
- Feature requests

### 3. 💻 Code Contributions
- Implement new features
- Fix bugs
- Improve performance
- Add tests
- Write examples

### 4. 📚 Documentation
- Improve README
- Write tutorials
- Create integration guides
- Translate documentation

### 5. 🔌 Integrations
- Build SDK for new languages (Python, Rust, Go, etc.)
- Create integrations with agent frameworks (LangChain, AutoGPT, etc.)
- Develop tools and utilities

## Getting Started

### 1. Fork the Repository

Click the "Fork" button on GitHub to create your own copy.

### 2. Clone Your Fork

```bash
git clone https://github.com/YOUR_USERNAME/agent-identity-protocol.git
cd agent-identity-protocol
```

### 3. Install Dependencies

#### TypeScript SDK
```bash
cd sdk/typescript
npm install
npm run build
```

#### Reference Server
```bash
cd reference-impl/server
npm install
npm run dev
```

### 4. Create a Branch

```bash
git checkout -b feature/your-feature-name
# or
git checkout -b fix/your-bug-fix
```

### 5. Make Your Changes

- Write code
- Add tests
- Update documentation

### 6. Test Your Changes

```bash
npm test
```

### 7. Commit

Use clear, descriptive commit messages:

```bash
git commit -m "feat: add Python SDK with basic client"
git commit -m "fix: handle rate limit errors in TypeScript SDK"
git commit -m "docs: add LangChain integration example"
```

**Commit message format**:
- `feat:` New feature
- `fix:` Bug fix
- `docs:` Documentation changes
- `test:` Adding tests
- `refactor:` Code refactoring
- `chore:` Maintenance tasks

### 8. Push and Create a Pull Request

```bash
git push origin feature/your-feature-name
```

Then open a Pull Request on GitHub.

## Pull Request Guidelines

### Before Submitting

- [ ] Code follows project style (Prettier for TypeScript)
- [ ] Tests pass (`npm test`)
- [ ] Documentation is updated (if needed)
- [ ] Commit messages are clear
- [ ] No unnecessary dependencies added

### PR Description Should Include

- **What**: Brief description of the change
- **Why**: Reason for the change
- **How**: Technical details (if complex)
- **Testing**: How you tested it
- **Screenshots**: If UI changes

### Example PR Description

```markdown
## What
Add Python SDK for AIP with basic client functionality

## Why
Many AI agent developers use Python, so we need a Python SDK to increase adoption.

## How
- Implemented `AIPClient` class with register/search/update methods
- Used `requests` for HTTP calls
- Added type hints for all public methods
- Included pytest tests with 90% coverage

## Testing
- Unit tests: `pytest tests/`
- Manual testing against local registry
- Tested with Python 3.9, 3.10, 3.11

## Related Issues
Closes #12
```

## Code Style

### TypeScript
- Use Prettier (config in `.prettierrc`)
- ESLint rules (config in `.eslintrc`)
- 2-space indentation
- Semicolons required

```typescript
// Good
export async function search(skill: string): Promise<AgentProfile[]> {
  const response = await fetch(`/agents?skill=${skill}`);
  return response.json();
}

// Bad
export async function search(skill: string): Promise<AgentProfile[]> 
{
    const response = await fetch(`/agents?skill=${skill}`)
    return response.json()
}
```

### Python (future)
- Follow PEP 8
- Type hints for all functions
- Docstrings for public APIs

## Testing

### TypeScript
```bash
cd sdk/typescript
npm test
npm run test:coverage  # Check coverage
```

### Manual Testing
```bash
cd reference-impl/server
npm run dev  # Start local registry at :3000

# In another terminal
cd examples/basic-agent
npm run start  # Run example
```

## Documentation

- Update README.md if adding major features
- Add inline comments for complex logic
- Create examples for new capabilities
- Update SPECIFICATION.md if changing protocol

## Areas We Need Help

### High Priority
- [ ] **Python SDK** - Full implementation
- [ ] **Rust SDK** - For performance-critical applications
- [ ] **CLI Tools** - `aip register`, `aip search`, etc.
- [ ] **Web UI** - Browser-based registry explorer
- [ ] **Integration Examples**
  - [ ] LangChain
  - [ ] AutoGPT
  - [ ] Semantic Kernel
  - [ ] Hugging Face Agents

### Medium Priority
- [ ] **Federation Protocol** - Cross-registry sync
- [ ] **Verifiable Credentials** - W3C DID integration
- [ ] **Performance Testing** - Benchmark tools
- [ ] **Monitoring** - Grafana dashboards for registries

### Low Priority
- [ ] **GraphQL API** - Alternative to REST
- [ ] **gRPC Support** - For high-performance use cases
- [ ] **Mobile SDKs** - Swift, Kotlin

## Communication

- **GitHub Issues**: Bug reports, feature requests
- **GitHub Discussions**: General questions, ideas
- **Discord** (coming soon): Real-time chat
- **Monthly Calls**: First Tuesday of each month, 6pm UTC

## Code of Conduct

We follow the [Contributor Covenant Code of Conduct](https://www.contributor-covenant.org/version/2/1/code_of_conduct/).

**In short**:
- Be respectful
- Be inclusive
- Be collaborative
- Focus on what's best for the community

## License

By contributing, you agree that your contributions will be licensed under the MIT License.

---

**Questions?** Open a GitHub Discussion or reach out to the maintainers.

Thank you for making AIP better! 🚀
