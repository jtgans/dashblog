build: clean
	mkdir build/DashBlog.wdgt
	cp -rp src/* build/DashBlog.wdgt

test-firefox: build
	open -a Firefox build/DashBlog.wdgt

test-safari: build
	open -a Safari build/DashBlog.wdgt

test: build
	open build/DashBlog.wdgt

clean:
	-rm -rf build/*

mrclean: clean
	-find . -iname \*~ -exec rm '{}' ';' -prune

.PHONY: test clean-test
