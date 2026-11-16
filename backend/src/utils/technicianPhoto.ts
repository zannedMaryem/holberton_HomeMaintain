export const MAX_TECHNICIAN_PHOTO_DATA_URL_LENGTH = 75_000;

export const isValidTechnicianPhotoDataUrl = (
  value: unknown,
): value is string => {
  if (
    typeof value !== "string" ||
    value.length > MAX_TECHNICIAN_PHOTO_DATA_URL_LENGTH
  ) {
    return false;
  }

  const match = value.match(
    /^data:image\/(?:jpeg|png|webp);base64,((?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?)$/,
  );
  return match !== null && match[1].length > 0;
};
