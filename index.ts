import * as k8s from "@pulumi/kubernetes";
import * as pulumi from "@pulumi/pulumi";
import * as fs from "fs";

let config = new pulumi.Config();
const replicas = config.getNumber("replicas") || 3;
const serviceType = config.get("serviceType") || "NodePort"; // or use LoadBalancer

const labels = { app: "ignite" };

const namespace = new k8s.core.v1.Namespace("ignite", {
    metadata: {
        name: "ignite"
    }
});

const service = new k8s.core.v1.Service("ignite-service", {
    metadata: {
        name: "ignite-service",
        namespace: namespace.metadata.name,
        labels: labels
    },
    spec: 
    {
        type: serviceType,
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
});

const configMap = new k8s.core.v1.ConfigMap("ignite-config", {
    metadata: {
        namespace: namespace.metadata.name
    },
    data: {
        "ignite-configuration.xml": fs.readFileSync("ignite-configuration.xml").toString()
    }
});

const statefulSet = new k8s.apps.v1.StatefulSet("ignite-custer", {
    metadata: {
        namespace: namespace.metadata.name
    },
    spec: {
        replicas: replicas,
        serviceName: "ignite",
        selector: {matchLabels: labels},
        template: {
            metadata: {
                labels: labels
            },
            spec: {
                serviceAccountName: serviceAccount.metadata.name,
                terminationGracePeriodSeconds: 60000,
                containers: [{
                    name: "ignite-node",
                    image: "apacheignite/ignite:2.9.0",
                    env: [
                        { name: "OPTION_LIBS", value: "ignite-kubernetes,ignite-rest-http" },
                        { name: "CONFIG_URI", value: "file:///ignite/config/ignite-configuration.xml" },
                        { name: "JVM_OPTS", value: "-DIGNITE_WAL_MMAP=false" }
                    ],
                    ports: [
                        { containerPort: 47100 }, // communication SPI port
                        { containerPort: 47500 }, // discovery SPI port
                        { containerPort: 49112 }, // JMX port
                        { containerPort: 10800 }, // thin clients/JDBC driver port
                        { containerPort: 8080 }   // REST API
                    ],
                    volumeMounts: [
                        { name: "config-vol", mountPath: "/ignite/config" },
                        { name: "work-vol", mountPath: "/ignite/work" },
                        { name: "wal-vol", mountPath: "/ignite/wal" },
                        { name: "walarchive-vol", mountPath: "/ignite/walarchive" }
                    ]
                }],
                securityContext: {
                    // try removing this if you have permission issues
                    fsGroup: 2000
                },
                volumes: [{
                    name: "config-vol",
                    configMap: { name: configMap.metadata.name }
                }]
            }
        },
        volumeClaimTemplates: [
            {
                metadata: { name: "work-vol" },
                spec: {
                    accessModes: [ "ReadWriteOnce" ],
                    resources: {
                        requests: {
                            storage: "1Gi"
                        }
                    }
                }
            },
            {
                metadata: { name: "wal-vol" },
                spec: {
                    accessModes: [ "ReadWriteOnce" ],
                    resources: {
                        requests: {
                            storage: "1Gi"
                        }
                    }
                }
            },
            {
                metadata: { name: "walarchive-vol" },
                spec: {
                    accessModes: [ "ReadWriteOnce" ],
                    resources: {
                        requests: {
                            storage: "1Gi"
                        }
                    }
                }
            }
        ]
    }
});

export const clusterName = statefulSet.metadata.name;
