// ============================================================
// Message Types — inter-agent communication
// ============================================================
/** The kind of channel agents communicate through. */
export var ChannelType;
(function (ChannelType) {
    ChannelType["Direct"] = "direct";
    ChannelType["Team"] = "team";
    ChannelType["Broadcast"] = "broadcast";
    ChannelType["Escalation"] = "escalation";
})(ChannelType || (ChannelType = {}));
/** Classification for individual messages. */
export var MessageType;
(function (MessageType) {
    MessageType["Chat"] = "chat";
    MessageType["TaskAssign"] = "task_assign";
    MessageType["CodeReview"] = "code_review";
    MessageType["Decision"] = "decision";
    MessageType["Artifact"] = "artifact";
})(MessageType || (MessageType = {}));
//# sourceMappingURL=message.js.map