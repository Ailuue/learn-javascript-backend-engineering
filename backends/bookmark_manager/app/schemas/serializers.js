// Response serializers — the JS analog of the `*Public` Pydantic models. They
// project Prisma's camelCase rows onto the snake_case JSON shape the API
// contract (and the tests) expect, and crucially never leak password_hash.

function tagPublic(tag) {
  return { id: tag.id, name: tag.name };
}

function userPublic(user) {
  return {
    id: user.id,
    email: user.email,
    username: user.username,
    is_active: user.isActive,
  };
}

function categoryPublic(category) {
  return {
    id: category.id,
    name: category.name,
    description: category.description,
  };
}

function bookmarkPublic(bookmark) {
  return {
    id: bookmark.id,
    url: bookmark.url,
    title: bookmark.title,
    description: bookmark.description,
    favorite: bookmark.favorite,
    click_count: bookmark.clickCount,
    category_id: bookmark.categoryId,
    created_at: bookmark.createdAt,
    updated_at: bookmark.updatedAt,
    tags: (bookmark.tags || []).map(tagPublic),
  };
}

function tokenResponse(accessToken) {
  return { access_token: accessToken, token_type: "bearer" };
}

module.exports = {
  tagPublic,
  userPublic,
  categoryPublic,
  bookmarkPublic,
  tokenResponse,
};
