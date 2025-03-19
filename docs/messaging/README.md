# Prax Messaging

Penumbra RPC transport is a separate subject, and not covered by these documents.

- [**Internal Control Messaging**](./internal-control.md): Communication between extension worker and documents (popup, options)
- [**Content Script Messaging**](./content-script.md): (in two distinct [worlds](https://developer.chrome.com/docs/extensions/reference/api/scripting#type-ExecutionWorld))
  - **Session Control**: Communication between isolated content scripts and extension worker
  - **DOM Provider**: Communication between mainworld content scripts and isolated content scripts

## Concerns

- **Document Boundaries**: Separate execution contexts have different needs and may call different APIs.
- **Sender Trust**: Listeners must identify the sending document and its permissions.
- **Error Handling**: Handlers should catch, serialize, and report unexpected failures.
- **Listener Specificity**: Listeners must selectively handle relevant messages.
- **Async Events**: Messaging is event-based and doesn't necessarily have a linear state flow.
