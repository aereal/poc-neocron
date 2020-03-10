import { join } from "path";
import { Stack, StackProps, Construct, Duration } from "@aws-cdk/core";
import {
  Function as LambdaFunction,
  Code,
  Runtime,
  Tracing,
} from "@aws-cdk/aws-lambda";
import { ITable } from "@aws-cdk/aws-dynamodb";
import { Task } from "@aws-cdk/aws-stepfunctions";
import { InvokeFunction } from "@aws-cdk/aws-stepfunctions-tasks";
import { Rule, Schedule } from "@aws-cdk/aws-events";
import { TransactionalTask } from "@aereal/qron";

interface SleeperTaskStackProps extends StackProps {
  readonly lockTable: ITable;
}

export class SleeperTaskStack extends Stack {
  constructor(scope: Construct, id: string, props: SleeperTaskStackProps) {
    super(scope, id, props);

    const functionsRoot = join(__dirname, "..", "..", "lambda-functions.dist");
    const taskFunction = new LambdaFunction(this, "SleepFunction", {
      code: Code.fromAsset(join(functionsRoot, "sleep")),
      handler: "sleep",
      timeout: Duration.minutes(10),
      runtime: Runtime.GO_1_X,
      tracing: Tracing.ACTIVE,
    });
    new TransactionalTask(this, "SleeperTask", {
      lockTable: props.lockTable,
      invokeMain: new Task(this, "InvokeFunction", {
        task: new InvokeFunction(taskFunction),
      }),
      taskName: "sleeper",
      invocationRule: new Rule(this, "RunEveryHourRule", {
        schedule: Schedule.cron({ minute: "0/10", weekDay: "MON-FRI" }),
      }),
    });
  }
}
