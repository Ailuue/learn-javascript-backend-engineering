/**
 * 05 · Mutations — CRUD & Error Handling
 * =======================================
 *
 * Two mutation patterns side by side:
 *   A. Simple return (object or nullable) — easy, but no structured error info.
 *   B. Mutation-payload union — return a union of success/error types so clients
 *      handle each case explicitly with inline fragments. The recommended pattern
 *      for any mutation that can fail (errors become part of the typed schema,
 *      not a generic top-level `errors` array).
 *
 * As in section 04, each returned object carries a `__typename` so the union's
 * `__resolveType` can pick the concrete type.
 */

const { makeExecutableSchema } = require("@graphql-tools/schema");
const { state } = require("./data");

const typeDefs = /* GraphQL */ `
  type TodoItem {
    id: ID!
    title: String!
    done: Boolean!
    priority: Int!
  }

  input CreateTodoInput {
    title: String!
    priority: Int = 1
  }

  input UpdateTodoInput {
    title: String
    done: Boolean
    priority: Int
  }

  type ValidationError {
    field: String!
    message: String!
  }

  type TodoNotFound {
    id: ID!
    message: String!
  }

  type CreateTodoSuccess {
    todo: TodoItem!
  }

  type UpdateTodoSuccess {
    todo: TodoItem!
  }

  union CreateTodoResult = CreateTodoSuccess | ValidationError
  union UpdateTodoResult = UpdateTodoSuccess | TodoNotFound | ValidationError
  union DeleteTodoResult = TodoItem | TodoNotFound

  type Query {
    todos: [TodoItem!]!
    todo(id: ID!): TodoItem
  }

  type Mutation {
    # Pattern A — simple returns
    createTodoSimple(input: CreateTodoInput!): TodoItem!
    toggleDoneSimple(id: ID!): TodoItem

    # Pattern B — typed-error payloads
    createTodo(input: CreateTodoInput!): CreateTodoResult!
    updateTodo(id: ID!, input: UpdateTodoInput!): UpdateTodoResult!
    deleteTodo(id: ID!): DeleteTodoResult!
  }
`;

const ok = (todo) => ({ ...todo, __typename: "TodoItem" });
const success = (typename, todo) => ({ __typename: typename, todo });
const validationError = (field, message) => ({ __typename: "ValidationError", field, message });
const notFound = (id) => ({ __typename: "TodoNotFound", id, message: "Todo item not found" });

const resolvers = {
  // Discriminate each union by the __typename we tag onto returned objects.
  CreateTodoResult: { __resolveType: (o) => o.__typename },
  UpdateTodoResult: { __resolveType: (o) => o.__typename },
  DeleteTodoResult: { __resolveType: (o) => o.__typename },

  Query: {
    todos: () => state.items,
    todo: (_p, { id }) => state.items.find((t) => t.id === id) ?? null,
  },

  Mutation: {
    // ── Pattern A ─────────────────────────────────────────────────────────
    createTodoSimple: (_p, { input }) => {
      const row = { id: String(state.nextId), title: input.title, done: false, priority: input.priority ?? 1 };
      state.items.push(row);
      state.nextId += 1;
      return row;
    },
    toggleDoneSimple: (_p, { id }) => {
      const item = state.items.find((t) => t.id === id);
      if (!item) return null; // client must check for null
      item.done = !item.done;
      return item;
    },

    // ── Pattern B ─────────────────────────────────────────────────────────
    createTodo: (_p, { input }) => {
      if (!input.title.trim()) return validationError("title", "Title cannot be empty");
      if (input.priority != null && !(input.priority >= 1 && input.priority <= 5)) {
        return validationError("priority", "Priority must be 1–5");
      }
      const row = { id: String(state.nextId), title: input.title.trim(), done: false, priority: input.priority ?? 1 };
      state.items.push(row);
      state.nextId += 1;
      return success("CreateTodoSuccess", row);
    },

    updateTodo: (_p, { id, input }) => {
      const row = state.items.find((t) => t.id === id);
      if (!row) return notFound(id);

      if (input.title != null) {
        if (!input.title.trim()) return validationError("title", "Title cannot be empty");
        row.title = input.title.trim();
      }
      if (input.done != null) row.done = input.done;
      if (input.priority != null) {
        if (!(input.priority >= 1 && input.priority <= 5)) {
          return validationError("priority", "Priority must be 1–5");
        }
        row.priority = input.priority;
      }
      return success("UpdateTodoSuccess", row);
    },

    deleteTodo: (_p, { id }) => {
      const i = state.items.findIndex((t) => t.id === id);
      if (i === -1) return notFound(id);
      const [row] = state.items.splice(i, 1);
      return ok(row);
    },
  },
};

const schema = makeExecutableSchema({ typeDefs, resolvers });

module.exports = { schema };
