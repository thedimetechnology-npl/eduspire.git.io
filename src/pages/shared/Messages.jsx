import { useEffect, useRef, useState } from "react";
import {
  Send, Plus, MessagesSquare, Paperclip, Search, Bell, BookmarkCheck,
} from "lucide-react";
import client, { API_URL } from "../../api/client";
import { Button, Input } from "../../components/ui/Kit";
import { Modal } from "../../components/ui/Modal";
import { useAuth } from "../../context/useAuth";
import { initials, fromNow } from "../../utils/helpers";

const WS_URL = import.meta.env.VITE_WS_URL || "ws://localhost:8000";

export default function Messages() {
  const { user } = useAuth();
  const [conversations, setConversations] = useState(null);
  const [activeId, setActiveId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState("");
  const [pickerOpen, setPickerOpen] = useState(false);
  const [contacts, setContacts] = useState([]);
  const [contactSearch, setContactSearch] = useState("");
  const [listSearch, setListSearch] = useState("");
  const wsRef = useRef(null);
  const bottomRef = useRef(null);

  const loadConversations = () =>
    client.get("/conversations").then(({ data }) => setConversations(data));
  useEffect(() => { loadConversations(); }, []);

  useEffect(() => {
    if (!activeId) return;
    client.get(`/conversations/${activeId}/messages`).then(({ data }) => setMessages(data));

    const token = localStorage.getItem("esp_access_token");
    const ws = new WebSocket(`${WS_URL}/ws/chat/${activeId}?token=${token}`);
    ws.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      setMessages((prev) => [...prev, msg]);
    };
    wsRef.current = ws;
    return () => ws.close();
  }, [activeId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = (e) => {
    e.preventDefault();
    if (!draft.trim() || wsRef.current?.readyState !== WebSocket.OPEN) return;
    wsRef.current.send(JSON.stringify({ content: draft }));
    setDraft("");
  };

  const openPicker = async () => {
    setPickerOpen(true);
    const endpoint = user.role === "student" ? "/users/teachers" : "/users/students";
    const { data } = await client.get(endpoint);
    setContacts(data);
  };

  const startConversation = async (otherUser) => {
    const { data } = await client.post("/conversations", { other_user_id: otherUser.id });
    setPickerOpen(false);
    setActiveId(data.id);
    loadConversations();
  };

  const filteredContacts = contacts.filter((c) =>
    c.full_name.toLowerCase().includes(contactSearch.toLowerCase())
  );
  const filteredConversations = (conversations ?? []).filter((c) =>
    c.other_user_name.toLowerCase().includes(listSearch.toLowerCase())
  );
  const active = conversations?.find((c) => c.id === activeId);

  return (
    <div
      className="-m-4 sm:-m-6 lg:-m-8 min-h-[calc(100vh-4rem)] relative"
      style={{
        backgroundImage: "url('/message.png')",
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
      }}
    >
      {/* Right-side veil for readability */}
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-white/90" />

      <div className="relative z-10 p-6 sm:p-8 lg:p-10 h-[calc(100vh-4rem)]">
        <div className="grid lg:grid-cols-[360px_1fr] gap-6 h-full">

          {/* ==================== LEFT: Conversation list (WhatsApp-style) ==================== */}
          <div className="bg-white/95 backdrop-blur-md rounded-2xl border border-gray-100 shadow-[0_8px_30px_-12px_rgba(0,0,0,0.15)] flex flex-col overflow-hidden">

            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <MessagesSquare className="w-5 h-5 text-blue-600" />
                <h2 className="font-bold text-[#0a1e5e]">Chats</h2>
                {conversations?.length > 0 && (
                  <span className="text-[10px] font-bold bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                    {conversations.length}
                  </span>
                )}
              </div>
              <button
                onClick={openPicker}
                className="p-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition shadow-md"
                title="New conversation"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>

            {/* Search */}
            <div className="p-3 border-b border-gray-100">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  value={listSearch}
                  onChange={(e) => setListSearch(e.target.value)}
                  placeholder="Search conversations..."
                  className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-gray-200 bg-gray-50 focus:outline-none focus:border-blue-500 focus:bg-white"
                />
              </div>
            </div>

            {/* Conversation list */}
            <div className="flex-1 overflow-y-auto">
              {conversations === null && (
                <p className="text-sm text-gray-400 text-center py-8">
                  Loading...
                </p>
              )}

              {conversations?.length === 0 && (
                <div className="text-center py-10 px-6">
                  <div className="w-14 h-14 mx-auto rounded-full bg-blue-50 flex items-center justify-center mb-3">
                    <MessagesSquare className="w-6 h-6 text-blue-600" />
                  </div>
                  <p className="text-sm font-semibold text-gray-700 mb-1">
                    No conversations yet
                  </p>
                  <p className="text-xs text-gray-500 mb-4">
                    Start chatting with a teacher or classmate
                  </p>
                  <Button
                    size="sm"
                    onClick={openPicker}
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                    icon={Plus}
                  >
                    Start a chat
                  </Button>
                </div>
              )}

              {conversations && conversations.length > 0 && filteredConversations.length === 0 && (
                <p className="text-sm text-gray-500 text-center py-8 px-4">
                  No conversations match "{listSearch}"
                </p>
              )}

              {filteredConversations.map((c) => {
                const isActive = activeId === c.id;
                return (
                  <button
                    key={c.id}
                    onClick={() => setActiveId(c.id)}
                    className={`w-full flex items-center gap-3 px-4 py-3 text-left border-b border-gray-100 last:border-0 transition-colors ${
                      isActive
                        ? "bg-blue-50"
                        : "hover:bg-gray-50"
                    }`}
                  >
                    <div className="relative shrink-0">
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-white flex items-center justify-center text-sm font-bold shadow-sm">
                        {initials(c.other_user_name)}
                      </div>
                      {isActive && (
                        <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-emerald-500 border-2 border-white" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between mb-0.5">
                        <p className={`text-sm truncate ${isActive ? "font-bold text-blue-700" : "font-semibold text-[#0a1e5e]"}`}>
                          {c.other_user_name}
                        </p>
                      </div>
                      <p className="text-xs text-gray-500 truncate">
                        {c.last_message || "Say hello!"}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* ==================== RIGHT: Chat window ==================== */}
          <div className="bg-white/95 backdrop-blur-md rounded-2xl border border-gray-100 shadow-[0_8px_30px_-12px_rgba(0,0,0,0.15)] flex flex-col overflow-hidden">

            {!active ? (
              /* No conversation selected — empty state */
              <div className="flex-1 flex items-center justify-center p-8">
                <div className="text-center max-w-sm">
                  <div className="w-20 h-20 mx-auto rounded-full bg-blue-50 flex items-center justify-center mb-4">
                    <MessagesSquare className="w-10 h-10 text-blue-600" />
                  </div>
                  <h3 className="text-lg font-bold text-[#0a1e5e] mb-2">
                    Your messages
                  </h3>
                  <p className="text-sm text-gray-500 mb-5">
                    Select a conversation from the list to start chatting, or
                    begin a new one with a teacher or classmate.
                  </p>
                  <Button
                    onClick={openPicker}
                    icon={Plus}
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    New conversation
                  </Button>
                </div>
              </div>
            ) : (
              /* Active chat */
              <>
                {/* Chat header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0 bg-gradient-to-r from-blue-50/60 to-transparent">
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-white flex items-center justify-center text-xs font-bold">
                        {initials(active.other_user_name)}
                      </div>
                      <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-emerald-500 border-2 border-white" />
                    </div>
                    <div>
                      <p className="font-semibold text-[#0a1e5e]">
                        {active.other_user_name}
                      </p>
                      <p className="text-[11px] text-emerald-600 font-medium">
                        Online
                      </p>
                    </div>
                  </div>
                </div>

                {/* Messages area — WhatsApp style with pattern background */}
                <div className="flex-1 overflow-y-auto px-6 py-5 space-y-3 bg-blue-50/30">
                  {messages.length === 0 && (
                    <div className="text-center py-10">
                      <p className="text-xs text-gray-400">
                        No messages yet — say hi!
                      </p>
                    </div>
                  )}
                  {messages.map((m) => {
                    const isMine = m.sender_id === user.id;
                    return (
                      <div
                        key={m.id}
                        className={`flex ${isMine ? "justify-end" : "justify-start"}`}
                      >
                        <div
                          className={`max-w-[70%] px-3.5 py-2 shadow-sm ${
                            isMine
                              ? "bg-blue-600 text-white rounded-lg rounded-tr-sm"
                              : "bg-white text-gray-800 rounded-lg rounded-tl-sm border border-gray-100"
                          }`}
                        >
                          {m.content && (
                            <p className="text-sm leading-relaxed whitespace-pre-wrap">
                              {m.content}
                            </p>
                          )}
                          {m.file_url && (
                            <a
                              href={`${API_URL.replace(/\/api$/, "")}${m.file_url}`}
                              target="_blank"
                              rel="noreferrer"
                              className={`text-xs underline flex items-center gap-1 mt-1.5 ${
                                isMine ? "text-white/90" : "text-blue-600"
                              }`}
                            >
                              <Paperclip className="w-3 h-3" /> Attachment
                            </a>
                          )}
                          <p
                            className={`text-[10px] mt-1 text-right ${
                              isMine ? "text-white/70" : "text-gray-400"
                            }`}
                          >
                            {fromNow(m.sent_at)}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                  <div ref={bottomRef} />
                </div>

                {/* Compose bar — WhatsApp style */}
                <form
                  onSubmit={sendMessage}
                  className="flex items-center gap-2 px-4 py-3 border-t border-gray-100 shrink-0 bg-white"
                >
                  <input
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    placeholder="Type a message"
                    className="flex-1 px-4 py-2.5 text-sm bg-gray-50 rounded-full border border-gray-200 focus:outline-none focus:border-blue-500 focus:bg-white transition"
                  />
                  <button
                    type="submit"
                    disabled={!draft.trim()}
                    className="w-11 h-11 rounded-full bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center text-white transition shadow-md"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </form>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Picker modal */}
      <Modal
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        title="Start a conversation"
      >
        <Input
          placeholder="Search..."
          value={contactSearch}
          onChange={(e) => setContactSearch(e.target.value)}
          className="mb-4"
        />
        <div className="max-h-80 overflow-y-auto space-y-1">
          {filteredContacts.map((c) => (
            <button
              key={c.id}
              onClick={() => startConversation(c)}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-gray-50 text-left"
            >
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-white flex items-center justify-center text-xs font-semibold">
                {initials(c.full_name)}
              </div>
              <span className="text-sm font-medium text-gray-800">
                {c.full_name}
              </span>
            </button>
          ))}
        </div>
      </Modal>
    </div>
  );
}