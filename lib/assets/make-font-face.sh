#! /bin/bash

FONT=`cat "$1" | base64 -w0`
echo "
@font-face {
    font-family: shellfish-icons;
    src: url(data:font/truetype;charset=utf-8;base64,${FONT}) format('truetype');
    font-weight: normal;
    font-style: normal;
}
"
