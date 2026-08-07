.PHONY: install demo build preview

install:
	npm install

demo: node_modules
	npm run dev:open

node_modules:
	npm install

build: node_modules
	npm run build

preview: node_modules
	npm run preview
