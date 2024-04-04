Shellfish can be used on Node.js with the `shellfish-node.js` tool.
This tool sets up a Shellfish environment for your code to run in.

You can find `shellfish-node.js` in the `dist` directory. It takes the bundle files
and the module manager (`require.js`) as parameters, along with your code to run.

```
node shellfish-node.js require.js shellfish.pkg shellfish-server.pkg myCode.js
```

Or, for running Shui code directly:

```
node shellfish-node.js require.js shellfish.pkg shellfish-server.pkg myCode.shui
```

The order of the files does not matter as long as the first `.js` file parameter
is `require.js`.

**Note:** The name of the `.shui` files must not contain `-` or any other
characters that are invalid in element names.

<div class="navstrip">
<span class="go-home"><a href="index.html">Contents</a></span>
<span class="go-next">{@tutorial server-http}</span>
</div>
