export const useScannerState = (scannerEl: HTMLElement) => {
  const showScanner = () => {
    scannerEl.classList.remove("hide");
  };

  const hideScanner = () => {
    scannerEl.classList.add("hide");
  };

  return {
    showScanner,
    hideScanner,
  };
};
