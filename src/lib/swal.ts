/**
 * Custom SweetAlert2 configuration using PUPR brand colors:
 * - Navy Blue: #1D3D72
 * - Yellow: #FFC72C
 * - White: #FFFFFF
 */
import Swal from "sweetalert2";

// Base Swal instance with custom PUPR theme
const LenteraSwal = Swal.mixin({
  customClass: {
    popup:
      "!rounded-2xl !border !border-[#1D3D72]/20 !shadow-2xl !font-sans !bg-white",
    title: "!text-[#1D3D72] !font-black !text-lg !pt-2",
    htmlContainer: "!text-[#1D3D72]/70 !text-sm !font-medium",
    confirmButton:
      "!bg-[#1D3D72] !text-white !font-bold !rounded-xl !px-6 !py-2.5 !text-sm hover:!bg-[#162d58] !shadow-md !border-none !outline-none",
    cancelButton:
      "!bg-white !text-[#1D3D72] !font-bold !rounded-xl !px-6 !py-2.5 !text-sm hover:!bg-gray-100 !border !border-[#1D3D72]/20 !shadow-sm !outline-none",
    icon: "!border-0",
    actions: "!gap-3 !mt-1",
  },
  buttonsStyling: false,
  reverseButtons: true,
  focusConfirm: false,
  showClass: {
    popup: "animate__animated animate__fadeInDown animate__faster",
  },
  hideClass: {
    popup: "animate__animated animate__fadeOutUp animate__faster",
  },
});

/**
 * Show a confirmation dialog with PUPR branding.
 */
export async function confirmDialog({
  title,
  text,
  confirmText = "Ya, Lanjutkan",
  cancelText = "Batal",
  isDanger = false,
}: {
  title: string;
  text: string;
  confirmText?: string;
  cancelText?: string;
  isDanger?: boolean;
}): Promise<boolean> {
  const result = await LenteraSwal.fire({
    title,
    html: `<span class="text-[#1D3D72]/70">${text}</span>`,
    icon: isDanger ? "warning" : "question",
    showCancelButton: true,
    confirmButtonText: confirmText,
    cancelButtonText: cancelText,
    customClass: {
      popup:
        "!rounded-2xl !border !border-[#1D3D72]/20 !shadow-2xl !font-sans !bg-white",
      title: "!text-[#1D3D72] !font-black !text-lg !pt-2",
      htmlContainer: "!text-[#1D3D72]/70 !text-sm !font-medium",
      confirmButton: isDanger
        ? "!bg-red-600 !text-white !font-bold !rounded-xl !px-6 !py-2.5 !text-sm hover:!bg-red-700 !shadow-md !border-none !outline-none"
        : "!bg-[#FFC72C] !text-[#1D3D72] !font-black !rounded-xl !px-6 !py-2.5 !text-sm hover:!bg-[#edb828] !shadow-md !border-none !outline-none",
      cancelButton:
        "!bg-white !text-[#1D3D72] !font-bold !rounded-xl !px-6 !py-2.5 !text-sm hover:!bg-gray-100 !border !border-[#1D3D72]/20 !shadow-sm !outline-none",
      icon: "!border-0",
      actions: "!gap-3 !mt-1",
    },
    buttonsStyling: false,
    reverseButtons: true,
  });
  return result.isConfirmed;
}

export default LenteraSwal;
