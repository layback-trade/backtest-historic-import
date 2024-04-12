// import { captureException } from '@sentry/node'

interface OnQueueFailureParams {
  // queue: string
  err: Error
  failedReason?: string
  // parentId?: string
}

export async function onQueueFailure({
  err,
  // queue,
  failedReason,
  // parentId,
}: OnQueueFailureParams) {
  // captureException(err)
  console.error(err, failedReason)
}
