import type { TrustLevel, IdentityMechanism, AuthorizationModel } from "../types/architecture";

export const TRUST_LEVELS: TrustLevel[] = ["external", "internal", "privileged", "restricted"];
export const IDENTITY_MECHANISMS: IdentityMechanism[] = ["jwt", "mtls", "api_key", "service_account", "none"];
export const AUTHORIZATION_MODELS: AuthorizationModel[] = ["role_based", "attribute_based", "policy_based", "none"];
export const NODE_TYPE_SUGGESTIONS = [
    "api gateway", "web app", "auth service", "microservice", "background worker", "database",
    "cache", "queue", "message broker", "control plane api", "orchestrator", "cluster admin"
];

export const PROTOCOL_SUGGESTIONS = ["https", "grpc", "queue", "amqp", "kafka", "postgres", "mysql", "redis"];
