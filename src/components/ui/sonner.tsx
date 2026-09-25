import { Toaster as Sonner } from "sonner";

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-white group-[.toaster]:text-[#100D3F] group-[.toaster]:border-[#E2DDD0] group-[.toaster]:shadow-xl",
          description: "group-[.toast]:text-[#706D65]",
          actionButton: "group-[.toast]:bg-[#100D3F] group-[.toast]:text-[#E2B321]",
          cancelButton: "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground",
        },
      }}
      {...props}
    />
  );
};

export { Toaster };
