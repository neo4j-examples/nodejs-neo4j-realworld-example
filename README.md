# ![RealWorld Example App](project-logo.png)

> ### Neo4j & Node.js codebase containing real world examples (CRUD, auth, advanced patterns, etc) that adheres to the [RealWorld](https://github.com/gothinkster/realworld) spec and API.


This codebase was created to demonstrate a fully fledged fullstack application built with a **Neo4j** database backed [Express.js](https://expressjs.com/) application including CRUD operations, authentication, routing, pagination, and more.

We've gone to great lengths to adhere to the [Neo4j](https://neo4j.com) and [Nest.js](https://nestjs.com)  community styleguides & best practices.

For more information on how to this works with other frontends/backends, head over to the [RealWorld](https://github.com/gothinkster/realworld) repo.


# How it works

Neo4j is a [Graph Database](https://neo4j.com/developer/graph-database/), a database designed to hold the connections between data (known as relationships) as important as the data itself.  A Neo4j database consists of Nodes connected together with Relationships.  Both nodes and relationships can contain one or more properties, which are key/value pairs.

For more information on how Neo4j compares to other databases, you can check the following links:

* [RDBMS to Graph](https://neo4j.com/developer/graph-db-vs-rdbms/)
* [NoSQL to Graph](https://neo4j.com/developer/graph-db-vs-nosql/)


## Data Model

![Data Model](./model/arrows.svg)

The data model diagram has been created with [Arrows](http://www.apcjones.com/arrows/).  You can edit the model by clicking the **Export Markup** button in Arrows, copying the contents of [arrows.html](model/arrows.html) into the text box and clicking **Save** at the bottom of the modal.


# Further Reading

This example was built as part of a series of Live Streams on the [Neo4j Twitch Channel](https://twitch.tv/neo4j_).  You can watch the videos back on the [Building Applications with Neo4j and Typescript playlist](https://www.youtube.com/c/neo4j/playlists) on the [Neo4j Youtube Channel](https://youtube.com/neo4j).



# Getting started

## Installation

```bash
$ npm install
```

## Running the app

```bash
# development
$ npm run start

# watch mode
$ npm run start:dev
```

## Test

```bash
# e2e tests
$ npm run test
```


# Questions, Comments, Support

If you have any questions or comments, please feel free to reach out on the [Neo4j Community Forum](https://community.neo4j.com) or create an Issue.  If you spot any bugs or missing features, feel free to submit a Pull Request.
