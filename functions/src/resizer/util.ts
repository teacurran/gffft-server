import * as path from "path"

export const extractFileNameWithoutExtension = (
  filePath: string,
  ext: string
) : string => {
  return path.basename(filePath, ext)
}

export const startsWithArray = (
  userInputPaths: string[],
  imagePath: string
) : boolean => {
  for (const userPath of userInputPaths) {
    const trimmedUserPath = userPath
      .trim()
      .replace(/\*/g, "([a-zA-Z0-9_\\-.\\s\\/]*)?")

    const regex = new RegExp("^" + trimmedUserPath + "(?:/.*|$)")

    if (regex.test(imagePath)) {
      return true
    }
  }
  return false
}
