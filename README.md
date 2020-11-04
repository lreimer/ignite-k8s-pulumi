# Apache Ignite on K8s using Pulumi

Deploy Apache Ignite 2.9.0 on K8s using Pulumi infrastructure as code.

## Usage

```bash
# optionally set configuration values
$ pulumi config set serviceType LoadBalancer
$ pulumi config set replicas 5

$ pulumi up
$ kubectl get all -n ignite
$ pulumi destroy
```

## References

- https://www.pulumi.com/blog/introducing-kube2pulumi/
- https://github.com/pulumi/kube2pulumi

## Maintainer

M.-Leander Reimer (@lreimer), <mario-leander.reimer@qaware.de>

## License

This software is provided under the MIT open source license, read the `LICENSE` file for details.
