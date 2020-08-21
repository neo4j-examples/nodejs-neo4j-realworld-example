CREATE (u:User {
    id: randomUUID(),
    username: $username,
    password: $password,
    email: $email,
    bio: $bio,
    image: $image
})
RETURN u