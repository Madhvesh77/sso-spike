// Temporary workaround to silence JSX intrinsic element type resolution issues.
// If multiple React type versions cause conflicts, this broad declaration prevents errors.
// Consider removing once underlying cause is resolved.
import * as React from "react";

declare global {
  namespace JSX {
    interface IntrinsicElements {
      [elemName: string]: any;
    }
  }
}
