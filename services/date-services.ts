export const formatDate = (dateInput: any, format: string) => {
  const date = typeof dateInput === "string" ? new Date(dateInput) : dateInput;

  const formatOptions: any = {
    "YYYY-MM-DD": () => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const day = String(date.getDate()).padStart(2, "0");
      return `${year}-${month}-${day}`;
    },
    "YYYY-MM-DDTHH:mm:ss": () => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const day = String(date.getDate()).padStart(2, "0");
      const hours = String(date.getHours()).padStart(2, "0");
      const minutes = String(date.getMinutes()).padStart(2, "0");
      const seconds = String(date.getSeconds()).padStart(2, "0");
      return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`;
    },
    "YYYY-MM-DD HH:mm:ss": () => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const day = String(date.getDate()).padStart(2, "0");
      const hours = String(date.getHours()).padStart(2, "0");
      const minutes = String(date.getMinutes()).padStart(2, "0");
      const seconds = String(date.getSeconds()).padStart(2, "0");
      return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
    },
    "Month Day, YYYY": () =>
      new Intl.DateTimeFormat("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      }).format(date),
    "MMM DD, YYYY": () =>
      new Intl.DateTimeFormat("en-US", {
        year: "numeric",
        month: "short",
        day: "2-digit",
      }).format(date),
    "MM/DD/YYYY": () =>
      new Intl.DateTimeFormat("en-US", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }).format(date),
    // Add more formats as needed
  };

  if (!formatOptions[format]) {
    throw new Error("Invalid format specified");
  }
  return typeof formatOptions[format] === "function"
    ? formatOptions[format]()
    : formatOptions[format];
};

// For getting a date range based on filter type
export const getFilterDates = (type: any) => {
  const today = new Date();
  let start, end;

  switch (type) {
    case "today":
      start = new Date(today);
      start.setHours(0, 0, 0, 0);
      end = new Date(today);
      end.setHours(23, 59, 59, 999);
      break;
    case "yesterday":
      start = new Date(today);
      start.setDate(today.getDate() - 1);
      start.setHours(0, 0, 0, 0);
      end = new Date(today);
      end.setDate(today.getDate() - 1);
      end.setHours(23, 59, 59, 999);
      break;
    case "last7":
      start = new Date(today);
      start.setDate(today.getDate() - 6);
      start.setHours(0, 0, 0, 0);
      end = new Date(today);
      end.setHours(23, 59, 59, 999);
      break;
    case "last30":
      start = new Date(today);
      start.setDate(today.getDate() - 29);
      start.setHours(0, 0, 0, 0);
      end = new Date(today);
      end.setHours(23, 59, 59, 999);
      break;
    case "thisMonth":
      start = new Date(today.getFullYear(), today.getMonth(), 1, 0, 0, 0, 0);
      end = new Date(today);
      end.setHours(23, 59, 59, 999);
      break;
    default:
      // Default to today if unrecognized
      start = new Date(today);
      start.setHours(0, 0, 0, 0);
      end = new Date(today);
      end.setHours(23, 59, 59, 999);
      break;
  }

  return {
    startDate: formatDate(start, "YYYY-MM-DDTHH:mm:ss"),
    endDate: formatDate(end, "YYYY-MM-DDTHH:mm:ss"),
  };
};

export const getTodayFormatted = (isEndOfDay = false) => {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}${isEndOfDay ? "T23:59:59" : "T00:00:00"}`;
};
