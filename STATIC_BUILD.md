The build was made for archival purposes only.
The original app depends on a node js server, but this creates a static app.

The static site is in the `site` directory;

Some files where hand copied and some where hand written,

Other files where generated, here are some commands from the project root:

```
# lessc to create main.css
$ node_modules/less/bin/lessc app/lib/main.less site/main.css

# create a single css file with almond as loader:
$ ./bin/optimize app/project site/main.js
```

