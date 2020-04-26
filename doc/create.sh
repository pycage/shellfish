#! /bin/bash

# This script creates the API documentation from the sources.

DOC_DIR=`dirname $0`
TARGET_DIR=$1
SHF_DIR="${DOC_DIR}/../lib"

DOCUMENTATION=`which documentation`

if [ -z "${DOCUMENTATION}" ]; then
  echo "documentation processor not found. Please install with"
  echo ""
  echo "  npm install -g documentation"
  exit 1
fi

[ -n "${TARGET_DIR}" ] && DOC_DIR="${TARGET_DIR}"

rm ${DOC_DIR}/*.html
rm -r ${DOC_DIR}/assets

documentation build -f html -o ${DOC_DIR} \
  ${SHF_DIR}/*.js \
  ${SHF_DIR}/core/*.js \
  ${SHF_DIR}/core/mid/*.js
