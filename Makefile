all: spec build
spec:
	@bigfile -e test/browser.js -w test/built.js -lb
	@mocha test/index.test.js
	@echo To run the tests in a browser just open "./test/index.html"
build:
	@bigfile -w dist/Bus.js -cp -x Bus