const CLOUDINARY_REGEX = /^https:\/\/res\.cloudinary\.com\//;

export function getDisplayUrl(url: string): string {
  if (CLOUDINARY_REGEX.test(url)) {
    return url.replace("res.cloudinary.com", "res-3.cloudinary.com");
  }
  return url;
}
