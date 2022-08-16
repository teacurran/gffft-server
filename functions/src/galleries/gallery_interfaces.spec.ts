import {HydratedGalleryItem} from "./gallery_models"
import {pathToRef} from "typesaurus"
import {User} from "../users/user_models"
import {getGalleryItemUrls} from "./gallery_interfaces"
import {expect} from "chai"

describe("Gallery Interfaces", function() {
  describe("getGalleryItemUrls", function() {
    it("should return a map of urls", function() {
      const gi = {
        id: "1",
        author: pathToRef<User>("users/1"),
        authorUser: {
          id: "1",
          name: "John Doe",
          handle: "jdoe",
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        liked: false,
        fileName: "fileName",
        filePath: "filePath",
        thumbnail: true,
        createdAt: new Date(),
        urls: [
          "http://example.com/320x320-photo-of-dog.jpg",
          "http://example.com/640x640-photo-of-dog.jpg",
          "http://example.com/1024x1024-photo-of-dog.jpg",
        ],
        description: "description",
        likes: [],
        likeCount: 0,
      } as HydratedGalleryItem

      const urls = getGalleryItemUrls(gi)
      expect(urls.size).to.equal(3)
      expect(urls.get("320")).to.equal("http://example.com/320x320-photo-of-dog.jpg")
      expect(urls.get("640")).to.equal("http://example.com/640x640-photo-of-dog.jpg")
      expect(urls.get("1024")).to.equal("http://example.com/1024x1024-photo-of-dog.jpg")
    })
  })
})
