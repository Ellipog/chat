import { motion } from "framer-motion";

interface LoadingScreenProps {
  size?: "small" | "medium" | "large";
  fullScreen?: boolean;
}

export default function LoadingScreen({
  size = "medium",
  fullScreen = false,
}: LoadingScreenProps) {
  const sizes = {
    small: "w-4 h-4",
    medium: "w-8 h-8",
    large: "w-12 h-12",
  };

  const Container = ({ children }: { children: React.ReactNode }) => {
    if (fullScreen) {
      return (
        <motion.div
          className="flex items-center justify-center h-screen"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, ease: "easeInOut" }}
        >
          {children}
        </motion.div>
      );
    }
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, ease: "easeInOut" }}
      >
        {children}
      </motion.div>
    );
  };

  return (
    <Container>
      <motion.div
        className={`${sizes[size]} rounded-full border-4 border-transparent border-t-gray-400`}
        animate={{ rotate: 360 }}
        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
      />
    </Container>
  );
}
