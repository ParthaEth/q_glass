.PHONY: install install-py demo demo-ui build preview

# Prefer miniforge; fall back to miniconda (AGENTS.md default path).
CONDA_SH = $$(test -f "$$HOME/miniforge3/etc/profile.d/conda.sh" && echo "$$HOME/miniforge3/etc/profile.d/conda.sh" || echo "$$HOME/miniconda3/etc/profile.d/conda.sh")
CONDA_ACTIVATE = source "$(CONDA_SH)" && conda activate vidLink

install:
	npm install

install-py:
	$(CONDA_ACTIVATE) && cd python && pip install -e ".[dev]"

node_modules:
	npm install

# Python serve starts the Vite UI unless --headless.
demo: node_modules install-py
	@echo "Open: http://127.0.0.1:5173/?adapter=http&api=http://127.0.0.1:8787"
	@$(CONDA_ACTIVATE) && python -m q_glass.examples.hello serve

demo-ui: node_modules
	@echo "UI-only simulated mode (no Python handlers)"
	npm run dev:open

build: node_modules
	npm run build

preview: node_modules
	npm run preview
