import { describe, it, expect, beforeEach } from "vitest";
import { useStore } from "../store/useStore";

describe("useStore", () => {
  beforeEach(() => {
    // Reset store to defaults
    useStore.setState({
      accessToken: null,
      userEmail: null,
      activeDocument: null,
      selectedNode: null,
      chatMessages: [],
    });
  });

  it("has correct defaults", () => {
    const state = useStore.getState();
    expect(state.accessToken).toBeNull();
    expect(state.userEmail).toBeNull();
    expect(state.activeDocument).toBeNull();
    expect(state.selectedNode).toBeNull();
    expect(state.chatMessages).toEqual([]);
  });

  it("sets access token", () => {
    useStore.getState().setAccessToken("token-123");
    expect(useStore.getState().accessToken).toBe("token-123");
  });

  it("sets user email", () => {
    useStore.getState().setUserEmail("test@example.com");
    expect(useStore.getState().userEmail).toBe("test@example.com");
  });

  it("sets active document and clears related state", () => {
    // First set some state
    useStore.getState().setSelectedNode({ id: "1", label: "Node 1" });
    useStore.getState().setChatMessages([
      { id: "1", role: "user", content: "hello" },
    ]);

    // Switch document — should clear selectedNode and chatMessages
    useStore.getState().setActiveDocument("doc-123");

    const state = useStore.getState();
    expect(state.activeDocument).toBe("doc-123");
    expect(state.selectedNode).toBeNull();
    expect(state.chatMessages).toEqual([]);
  });

  it("sets selected node", () => {
    const node = { id: "node-1", label: "Chapter 1", type: "section" };
    useStore.getState().setSelectedNode(node);
    expect(useStore.getState().selectedNode).toEqual(node);
  });

  it("clears chat messages", () => {
    useStore.getState().setChatMessages([
      { id: "1", role: "user", content: "hi" },
    ]);
    useStore.getState().clearChatMessages();
    expect(useStore.getState().chatMessages).toEqual([]);
  });
});
