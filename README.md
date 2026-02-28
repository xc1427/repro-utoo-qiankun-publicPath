# README

This is a repro for a bug in umi where `publicPath`,`runtimePublicPath` and `qiankun` are used together, the dev server will render a blank page due to js file's content being actually entry html.

