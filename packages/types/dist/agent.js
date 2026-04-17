// ============================================================
// Agent Types — roles, personas, and runtime states
// ============================================================
/** Every role that can appear in the organisational hierarchy. */
export var AgentRole;
(function (AgentRole) {
    AgentRole["CEO"] = "ceo";
    AgentRole["CTO"] = "cto";
    AgentRole["StaffManager"] = "staff_manager";
    AgentRole["SeniorManager"] = "senior_manager";
    AgentRole["Manager"] = "manager";
    AgentRole["PM"] = "pm";
    AgentRole["Developer"] = "developer";
    AgentRole["SeniorDeveloper"] = "senior_developer";
    AgentRole["QA"] = "qa";
    AgentRole["Tester"] = "tester";
})(AgentRole || (AgentRole = {}));
/** Observable agent states shown in the game UI. */
export var AgentState;
(function (AgentState) {
    AgentState["Idle"] = "idle";
    AgentState["Thinking"] = "thinking";
    AgentState["Coding"] = "coding";
    AgentState["Discussing"] = "discussing";
    AgentState["Reviewing"] = "reviewing";
    AgentState["Walking"] = "walking";
    AgentState["Meeting"] = "meeting";
})(AgentState || (AgentState = {}));
//# sourceMappingURL=agent.js.map