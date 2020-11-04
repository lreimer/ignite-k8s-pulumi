import * as k8s from "@pulumi/kubernetes";
import * as kx from "@pulumi/kubernetesx";

const labels = { app: "ignite" };

const namespace = new k8s.core.v1.Namespace("ignite")

const service = new k8s.core.v1.Service("ignite-service", {
    metadata: {
        namespace: namespace.metadata.name,
        labels: labels
    },
    spec: {
        type: "LoadBalancer",
        ports: [
            {name: "rest", port: 8080, targetPort: 8080},
            {name: "thin", port: 10800, targetPort: 10800}
        ],
        // use ClientIP if client are deployed in Kubernetes
        // sessionAffinity: "ClientIP",
        selector: labels
    }
});

const serviceAccount = new k8s.core.v1.ServiceAccount("ignite", {
    metadata: {
        namespace: namespace.metadata.name
    }
});

const clusterRole = new k8s.rbac.v1.ClusterRole("ignite", {
    metadata: {
        namespace: namespace.metadata.name
    },
    rules: [{
        apiGroups: [""],
        resources: ["pods", "endpoints"],
        verbs: ["get", "list", "watch"]
    }]
});

const clusterRoleBinding = new k8s.rbac.v1.ClusterRoleBinding("ignite", {
    metadata: {
        namespace: namespace.metadata.name
    },
    roleRef: {
        kind: "ClusterRole",
        apiGroup: "rbac.authorization.k8s.io",
        name: clusterRole.metadata.name
    },
    subjects: [{
        kind: "ServiceAccount",
        name: serviceAccount.metadata.name,
        namespace: namespace.metadata.name
    }]
})

const statefulSet = new k8s.apps.v1.StatefulSet("ignite-custer", {
    
});

export const clusterName = statefulSet.metadata.name;
