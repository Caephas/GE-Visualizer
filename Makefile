FRONTEND := frontend
NPM := npm

.DEFAULT_GOAL := help
.PHONY: help setup dev preview stop check test typecheck lint build verify-engine clean

help: ## Show available targets
	@grep -E '^[a-zA-Z0-9_-]+:.*?## ' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  %-14s %s\n", $$1, $$2}'

setup: ## Install dependencies and fetch the Pyodide runtime
	cd $(FRONTEND) && $(NPM) install

dev: ## Run the local dev server on :5173
	cd $(FRONTEND) && $(NPM) run dev

preview: ## Serve the production build on :4173
	cd $(FRONTEND) && $(NPM) run preview

stop: ## Stop the dev (:5173) and preview (:4173) servers
	@echo "Stopping GE Visualizer…"
	@pids=$$(lsof -ti tcp:5173 -ti tcp:4173 2>/dev/null || true); \
	if [ -n "$$pids" ]; then echo "$$pids" | xargs kill; echo "Stopped."; \
	else echo "Nothing to stop — no server on :5173 or :4173."; fi

check: typecheck lint test build verify-engine ## Run the full gate before committing

test: ## Run the frontend test suite
	cd $(FRONTEND) && $(NPM) test

typecheck: ## Type-check the frontend
	cd $(FRONTEND) && $(NPM) run typecheck

lint: ## Lint the frontend
	cd $(FRONTEND) && $(NPM) run lint

build: ## Build the static site into frontend/dist
	cd $(FRONTEND) && $(NPM) run build

verify-engine: ## Verify the in-browser GRAPE engine under real Pyodide against the golden fixtures
	cd $(FRONTEND) && $(NPM) run verify:engine

clean: ## Remove build artifacts and the copied Pyodide runtime (keeps node_modules)
	rm -rf $(FRONTEND)/dist $(FRONTEND)/public/pyodide
