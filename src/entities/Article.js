
module.exports = class Article {
    constructor(article, author, tagList, favoritesCount, favorited) {
        this.article = article
        this.author = author
        this.tagList = tagList
        this.favoritesCount = favoritesCount
        this.favorited = favorited

    }

    toJson() {
        return {
            ...this.article.properties,
            favoritesCount: this.favoritesCount,
            favorited: this.favorited,
            author: this.author.toJson(),
            tagList: this.tagList.map(tag => tag.toJson()),
        }
    }

}