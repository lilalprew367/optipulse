import ReactMarkdown from 'react-markdown';
import { Brain } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

export default function AIReview({ review, loading }) {
  return (
    <div className="border border-primary/30 rounded-lg bg-primary/5 p-5">
      <div className="flex items-center gap-2 mb-4">
        <Brain className="w-4 h-4 text-primary" />
        <span className="font-mono text-sm font-semibold text-primary uppercase tracking-widest">AI Performance Review</span>
      </div>
      {loading ? (
        <div className="space-y-2">
          <Skeleton className="h-4 w-full bg-primary/10" />
          <Skeleton className="h-4 w-5/6 bg-primary/10" />
          <Skeleton className="h-4 w-4/6 bg-primary/10" />
          <Skeleton className="h-4 w-full bg-primary/10" />
          <Skeleton className="h-4 w-3/4 bg-primary/10" />
        </div>
      ) : (
        <ReactMarkdown
          className="prose prose-sm prose-invert max-w-none text-foreground/90
            [&>h1]:text-primary [&>h2]:text-primary [&>h3]:text-primary/80
            [&>h1]:font-mono [&>h2]:font-mono [&>h3]:font-mono
            [&>h2]:text-base [&>h3]:text-sm
            [&>ul]:list-disc [&>ul]:ml-4 [&>ol]:list-decimal [&>ol]:ml-4
            [&>p]:text-sm [&>p]:leading-relaxed [&>li]:text-sm"
        >
          {review}
        </ReactMarkdown>
      )}
    </div>
  );
}