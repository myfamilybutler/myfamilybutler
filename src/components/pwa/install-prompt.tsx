"use client";

import { usePwaInstall } from "@/hooks/use-pwa-install";
import { useTranslation } from "react-i18next";
import { X, Download, Share } from "lucide-react";
import { Button } from "@/components/ui/button";

export function InstallPrompt() {
  const { t } = useTranslation();
  const { canInstall, isIOS, isInstalled, promptInstall, dismiss } = usePwaInstall();

  // Don't show if already installed or neither iOS nor installable
  if (isInstalled || (!canInstall && !isIOS)) {
    return null;
  }

  // Check if on iOS but using Chrome (which can't install PWAs)
  const isIOSChrome = isIOS && typeof navigator !== "undefined" && 
    /crios/i.test(navigator.userAgent);

  // iOS needs special instructions since it doesn't support beforeinstallprompt
  // Chrome on iOS also can't install - must use Safari
  if (isIOS) {
    return (
      <div className="fixed bottom-4 left-4 right-4 z-50 mx-auto max-w-md animate-in slide-in-from-bottom-4 duration-300">
        <div className="relative bg-card rounded-xl shadow-lg border border-border p-4">
          <button
            onClick={dismiss}
            className="absolute top-2 right-2 p-1 text-muted-foreground hover:text-foreground"
            aria-label={t("pwa.dismiss")}
          >
            <X className="h-4 w-4" />
          </button>
          <div className="flex items-start gap-3 pr-6">
            <div className="flex-shrink-0 p-2 bg-blue-100 dark:bg-blue-500/20 rounded-lg">
              <Share className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground text-sm">
                {t("pwa.install")}
              </h3>
              <p className="text-xs text-muted-foreground mt-1">
                {isIOSChrome ? t("pwa.iosChromeInstructions") : t("pwa.iosInstructions")}
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Standard A2HS prompt for Android/Desktop
  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 mx-auto max-w-md animate-in slide-in-from-bottom-4 duration-300">
      <div className="relative bg-card rounded-xl shadow-lg border border-border p-4">
        <button
          onClick={dismiss}
          className="absolute top-2 right-2 p-1 text-muted-foreground hover:text-foreground"
          aria-label={t("pwa.dismiss")}
        >
          <X className="h-4 w-4" />
        </button>
        <div className="flex items-center gap-3 pr-6">
          <div className="flex-shrink-0 p-2 bg-blue-100 dark:bg-blue-500/20 rounded-lg">
            <Download className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-foreground text-sm">
              {t("pwa.install")}
            </h3>
            <p className="text-xs text-muted-foreground">
              {t("pwa.installDescription")}
            </p>
          </div>
          <Button
            size="sm"
            onClick={promptInstall}
            className="flex-shrink-0"
          >
            {t("pwa.installButton")}
          </Button>
        </div>
      </div>
    </div>
  );
}
