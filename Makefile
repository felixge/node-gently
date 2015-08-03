SHELL := /usr/bin/env bash

.PHONY: release-major
release-major: build test
	@npm version major -m "Release %s"
	@git push
	@npm publish

.PHONY: release-minor
release-minor: build test
	@npm version minor -m "Release %s"
	@git push
	@npm publish

.PHONY: release-patch
release-patch: build test
	@npm version patch -m "Release %s"
	@git push
	@npm publish

.PHONY: test
test:
	@find test/simple/test-*.js | xargs -n 1 -t node
