The Shellfish SDK assists you with tools to

 * build the API documentation locally
 * build the Shellfish runtime bundle files, such as `shellfish.pkg`

# Setup

## Installing the Requirements

First of all, you need [Node.js](https://nodejs.org) (the LTS version ought to be fine)
along with the `npm` package manager.

In the `shellfish` directory, run

    npm install

to install the requirements of the SDK. These requirements are just
for the SDK; Shellfish itself has no external dependencies.

## Building the Runtime Bundle File

Next, run

    npm run build-all

to create the Shellfish bundle files with ending `.pkg` in the `dist` subdirectory.

## Building the API Documentation

Run

    npm run generate-docs

to build the API documentation in HTML format in the directory `dist/doc/`.

## Exploring the Gallery

Shellfish comes with a gallery of examples along with their source code in
the `gallery` subdirectory. Run

    npm run run-gallery

to start a web server. Then point your browser to

    http://localhoat:8000

# Distributing the Shellfish Runtime

When distributing a Shellfish application, all you need are the files

 * `require.js` (found in the `lib` subdirectory)
 * `shellfish.pkg` (the file you have built in the previous step)
 * some of the other `.pkg` files if needed
 * and of course an `index.html` as the application's entry point

along with your code.

These are all static files, so put them on your webserver of choice. For the
`index.html` file, just use the one you can find in the `gallery/www` subdirectory
as a base.

Add another file `main.shui` with this code:

    require "shellfish/ui";

    Document {
        Label {
            text: "Hello World!"
        }        
    }

Now point your browser to `index.html` on the webserver to see your first
Shellfish application in action.


## The Purpose of `index.html`

The only purpose of `index.html` is to provide an entry point for your
application. Take a look at the one you just copied and you will notice these
lines:

    <script src="require.js"
            data-bundle="shellfish.pkg"
            data-main="shui-loader.js"
            data-shui="main.shui"></script>

This does the following:

 * load `require.js` as script
 * pass `data-bundle` as parameter to the script to instruct it to load
  the bundle file `shellfish.pkg` (it is possible to load multiple bundle files
  separated by comma)
 * pass `data-main` as parameter for the entry point, which is the script
   `shui-loader.js` contained in the bundle file
 * pass `data-shui` as parameter to instruct `shui-loader.js` to load the
   Shui file `main.shui`

Besides that, this `index.html` checks the environment for proper JavaScript
support and shows progress while the application is being initialized.
Edit the entry point `index.html` to your likings.

<div class="navstrip"><span class="go-home"><a href="index.html">Contents</a></span><span class="go-next">
{@tutorial concepts}
</span></div>
