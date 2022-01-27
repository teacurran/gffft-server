// tracing.js

import process from "process"
import {Metadata, credentials} from "@grpc/grpc-js"

import {NodeSDK} from "@opentelemetry/sdk-node"
import {getNodeAutoInstrumentations} from "@opentelemetry/auto-instrumentations-node"
import {Resource} from "@opentelemetry/resources"
import {SemanticResourceAttributes} from "@opentelemetry/semantic-conventions"
import {OTLPTraceExporter} from "@opentelemetry/exporter-trace-otlp-grpc"

const metadata = new Metadata()
metadata.set("x-honeycomb-team", "160965349838cd907f5532a79ee04410")
metadata.set("x-honeycomb-dataset", "gffft")
const traceExporter = new OTLPTraceExporter({
  url: "grpc://api.honeycomb.io:443/",
  credentials: credentials.createSsl(),
  metadata,
})

const sdk = new NodeSDK({
  resource: new Resource({
    [SemanticResourceAttributes.SERVICE_NAME]: "api",
  }),
  traceExporter,
  instrumentations: [getNodeAutoInstrumentations()],
})

sdk.start()
  .then(() => console.log("Tracing initialized"))
  .catch((error) => console.log("Error initializing tracing", error))

process.on("SIGTERM", () => {
  sdk.shutdown()
    .then(() => console.log("Tracing terminated"))
    .catch((error) => console.log("Error terminating tracing", error))
    .finally(() => process.exit(0))
})