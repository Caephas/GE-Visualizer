VENV := venv
PYTHON := $(VENV)/bin/python
PIP := $(VENV)/bin/pip
UVICORN := $(VENV)/bin/uvicorn
FRONTEND := frontend
NPM := npm

.PHONY: help setup api backend dev stop test test-backend test-frontend typecheck lint build smoke schemas fixtures clean

help: ## Show available targets
	@grep -E '^[a-zA-Z_-]+:.*?## ' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  %-14s %s\n", $$1, $$2}'

setup: ## Create the venv and install backend + frontend dependencies
	python3 -m venv $(VENV)
	$(PIP) install -r backend/requirements.txt
	cd $(FRONTEND) && $(NPM) install

api: ## Run the FastAPI backend with reload on :8000
	$(UVICORN) backend.main:app --reload --port 8000

backend: api ## Alias for `make api`

dev: ## Run the Vite dev server on :5173
	cd $(FRONTEND) && $(NPM) run dev

frontend: dev ## Alias for `make dev`

stop: ## Stop the API and dev servers (ports 8000 and 5173)
	@echo "Stopping GE Visualizer servers on :8000 and :5173…"
	@pids=$$(lsof -ti tcp:8000 -ti tcp:5173 2>/dev/null || true); \
	if [ -n "$$pids" ]; then \
		echo "$$pids" | xargs kill; \
		echo "Stopped."; \
	else \
		echo "Nothing to stop — no server on :8000 or :5173."; \
	fi

test: test-backend test-frontend ## Run the full test suite

test-backend: ## Run backend tests (pytest)
	$(PYTHON) -m pytest -q

test-frontend: ## Run frontend tests (vitest)
	cd $(FRONTEND) && $(NPM) test

typecheck: ## Type-check the frontend
	cd $(FRONTEND) && $(NPM) run typecheck

lint: ## Lint the frontend
	cd $(FRONTEND) && $(NPM) run lint

build: ## Build the frontend for production
	cd $(FRONTEND) && $(NPM) run build

smoke: ## Run the e2e smoke test (start `make api` and `make dev` first)
	$(PYTHON) tools/e2e_smoke.py
	$(PYTHON) tools/e2e_smoke.py --base http://localhost:5173/api

schemas: ## Regenerate the pydantic -> TS schema-mirror fixture
	$(PYTHON) tools/export_schemas.py

fixtures: ## Regenerate golden fixtures from unpatched grape-bds
	$(PYTHON) tools/reference_mapper.py

clean: ## Remove build artifacts and caches (keeps venv and node_modules)
	rm -rf $(FRONTEND)/dist .pytest_cache .mypy_cache .ruff_cache
	find backend tools -type d -name __pycache__ -exec rm -rf {} +
