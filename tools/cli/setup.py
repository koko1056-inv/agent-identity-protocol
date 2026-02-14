from setuptools import setup, find_packages

setup(
    name="aip-cli",
    version="0.2.0",
    author="Agent Identity Protocol Working Group",
    description="Command-line tools for Agent Identity Protocol",
    url="https://github.com/koko1056-inv/agent-identity-protocol",
    packages=find_packages(),
    python_requires=">=3.9",
    install_requires=[
        "click>=8.1.0",
        "rich>=13.5.0",
        "agent-identity-protocol>=0.2.0",
        "pyyaml>=6.0",
    ],
    entry_points={
        "console_scripts": [
            "aip=aip_cli.cli:cli",
        ],
    },
    classifiers=[
        "Development Status :: 3 - Alpha",
        "Intended Audience :: Developers",
        "License :: OSI Approved :: MIT License",
        "Programming Language :: Python :: 3",
        "Programming Language :: Python :: 3.9",
        "Programming Language :: Python :: 3.10",
        "Programming Language :: Python :: 3.11",
        "Programming Language :: Python :: 3.12",
    ],
)
