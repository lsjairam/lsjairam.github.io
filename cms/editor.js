// Build from individual ESM modules, never the all-in-one prebuilt distribution.
import React from "react";
import createClass from "create-react-class";
import CMS from "decap-cms-core";
import { GitHubBackend } from "decap-cms-backend-github";
import StringWidget from "decap-cms-widget-string";
import TextWidget from "decap-cms-widget-text";
import DatetimeWidget from "decap-cms-widget-datetime";
import SelectWidget from "decap-cms-widget-select";
import ImageWidget from "decap-cms-widget-image";
import FileWidget from "decap-cms-widget-file";
import ObjectWidget from "decap-cms-widget-object";
import MarkdownWidget from "decap-cms-widget-markdown";
import image from "decap-cms-editor-component-image";
import { en } from "decap-cms-locales";
import { cmsAssetPath } from "../lib/cms-assets.cjs";

function withUploadAssets(Component) {
  return function UploadAwareWidget(props) {
    return React.createElement(Component, { ...props,
      getAsset: (path, field) => props.getAsset(cmsAssetPath(path), field),
    });
  };
}

CMS.registerBackend("github", GitHubBackend);
CMS.registerWidget([
  StringWidget.Widget(), TextWidget.Widget(), DatetimeWidget.Widget(),
  SelectWidget.Widget(), ImageWidget.Widget({
    controlComponent: withUploadAssets(ImageWidget.controlComponent),
    previewComponent: withUploadAssets(ImageWidget.previewComponent),
  }), FileWidget.Widget(), ObjectWidget.Widget(), MarkdownWidget.Widget({
    controlComponent: withUploadAssets(MarkdownWidget.controlComponent),
    previewComponent: withUploadAssets(MarkdownWidget.previewComponent),
  }),
]);
CMS.registerLocale("en", en);
CMS.registerEditorComponent(image);
window.CMS = CMS;
window.h = React.createElement;
window.createClass = createClass;
window.cmsAssetPath = cmsAssetPath;
// preview.js registers the site-specific preview before initializing.
