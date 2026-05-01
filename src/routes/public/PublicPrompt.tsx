import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { FileText } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MarkdownViewer } from '@/components/MarkdownViewer';
import { Loading } from '@/components/Loading';
import { getPromptBySlug } from '@/api/prompts';
import type { PromptWithTags } from '@/lib/types';

export function PublicPrompt() {
  const { slug } = useParams<{ slug: string }>();
  const [prompt, setPrompt] = useState<PromptWithTags | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (slug) {
      loadPrompt();
    }
  }, [slug]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadPrompt = async () => {
    if (!slug) return;

    setLoading(true);
    setError(null);
    try {
      const data = await getPromptBySlug(slug);
      setPrompt(data);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Prompt not found');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/40">
        <Loading />
      </div>
    );
  }

  if (error || !prompt) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/40 p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Prompt Not Found</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              {error || 'This prompt does not exist or is not public.'}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/40 p-4">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6 flex items-center gap-4">
          <div className="rounded-lg bg-primary/10 p-3">
            <FileText className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">{prompt.title}</h1>
            <p className="text-sm text-muted-foreground">
              Updated {new Date(prompt.updated_at).toLocaleDateString()}
            </p>
          </div>
        </div>

        <Card>
          <CardContent className="pt-6">
            <MarkdownViewer content={prompt.body_md} />
          </CardContent>
        </Card>

        <div className="mt-6 text-center text-sm text-muted-foreground">
          <p>
            Powered by{' '}
            <a href="/" className="text-primary hover:underline">
              PromptStash
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
