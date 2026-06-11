import Link from 'next/link';
import { getPublicPostForApproval } from '@/actions/public-approvals';
import { getPublicSession } from '@/actions/public-access';
import PublicApprovalPanel from '@/components/aprovacao/PublicApprovalPanel';
import MediaGallery from '@/components/cliente/MediaGallery';

type PublicPostPageProps = {
  params: Promise<{
    token: string;
    postId: string;
  }>;
};

const FORMAT_LABEL: Record<string, string> = {
  reels: 'Reels',
  carrossel: 'Carrossel',
  post_estatico: 'Post estático',
  story: 'Story',
  outro: 'Outro',
};

const STATUS_LABEL: Record<string, string> = {
  pendente: 'Aguardando aprovação',
  em_revisao: 'Em revisão',
  aprovado: 'Aprovado',
  em_producao: 'Em produção',
  finalizado: 'Finalizado',
};

function getPostDate(post: {
  scheduled_date?: string | null;
  publish_date?: string | null;
  published_at?: string | null;
}) {
  return post.scheduled_date || post.publish_date || post.published_at || null;
}

function formatDate(date: string) {
  try {
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).format(new Date(date));
  } catch {
    return null;
  }
}

function getPostType(post: {
  format?: string | null;
  type?: string | null;
}) {
  const raw = post.format || post.type || null;
  return raw ? (FORMAT_LABEL[raw] ?? raw) : 'Post';
}

export default async function PublicPostPage({ params }: PublicPostPageProps) {
  const { token, postId } = await params;

  const result = await getPublicPostForApproval(token, postId);

  if (!result.success) {
    return (
      <main className="min-h-screen bg-[#f6f6f6] px-4 py-8">
        <div className="mx-auto max-w-2xl rounded-2xl border border-red-200 bg-white p-6 shadow-sm">
          <p className="mb-2 text-sm font-semibold text-red-600">
            Erro ao abrir aprovação pública
          </p>

          <h1 className="text-2xl font-bold text-zinc-900">
            Não foi possível encontrar este post
          </h1>

          <p className="mt-3 text-sm leading-6 text-zinc-600">
            {result.error ||
              'O link pode estar incorreto, expirado ou o post não pertence a este cronograma.'}
          </p>

          <div className="mt-5 rounded-xl bg-zinc-50 p-4 text-xs text-zinc-600">
            <p>
              <strong>Token:</strong> {token}
            </p>
            <p>
              <strong>Post ID:</strong> {postId}
            </p>
          </div>

          <Link
            href={`/acesso/${token}`}
            className="mt-5 inline-flex rounded-xl bg-[#25411e] px-4 py-2 text-sm font-medium text-white hover:opacity-90"
          >
            Voltar para o cronograma
          </Link>
        </div>
      </main>
    );
  }

  const { campaign, post, files } = result.data;

  const session = await getPublicSession(campaign.id);
  const visitorName = session?.visitor_name ?? null;

  const client = Array.isArray(campaign.clients)
    ? campaign.clients[0]
    : campaign.clients;
  const clientName = client?.company_name || client?.name || null;
  const clientLogoUrl = client?.logo_url || null;

  const postDate = getPostDate(post);
  const postType = getPostType(post);

  return (
    <main className="min-h-screen bg-[#f6f6f6] px-4 py-8">
      <div className="mx-auto max-w-5xl">
        <div className="mb-6">
          <Link
            href={`/acesso/${token}`}
            className="text-sm font-medium text-[#25411e] hover:underline"
          >
            ← Voltar para o cronograma
          </Link>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
          <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
            <div className="mb-5 border-b border-zinc-100 pb-4">
              <p className="mb-2 text-sm font-medium text-[#eb6013]">
                {campaign.title || campaign.name || 'Cronograma'}
              </p>

              <h1 className="text-2xl font-bold text-zinc-900">
                {post.title || 'Post sem título'}
              </h1>

              <div className="mt-3 flex flex-wrap gap-2 text-xs">
                <span className="rounded-full bg-zinc-100 px-3 py-1 font-medium text-zinc-700">
                  {postType}
                </span>

                {postDate ? (
                  <span className="rounded-full bg-zinc-100 px-3 py-1 font-medium text-zinc-700">
                    {formatDate(postDate)}
                  </span>
                ) : null}

                {post.status && STATUS_LABEL[post.status] ? (
                  <span className="rounded-full bg-zinc-100 px-3 py-1 font-medium text-zinc-700">
                    {STATUS_LABEL[post.status]}
                  </span>
                ) : null}
              </div>
            </div>

            {files.length > 0 ? (
              <div className="mb-5">
                <MediaGallery
                  files={files}
                  postTitle={post.title || 'Post sem título'}
                  postFormat={postType}
                  format={post.format}
                  caption={post.caption}
                  clientName={clientName}
                  clientLogoUrl={clientLogoUrl}
                />
              </div>
            ) : null}

            <div className="space-y-5">
              {post.description ? (
                <div>
                  <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-zinc-500">
                    Descrição
                  </h2>

                  <p className="whitespace-pre-line text-sm leading-6 text-zinc-700">
                    {post.description}
                  </p>
                </div>
              ) : null}

              {post.caption ? (
                <div>
                  <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-zinc-500">
                    Legenda
                  </h2>

                  <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
                    <p className="whitespace-pre-line text-sm leading-6 text-zinc-700">
                      {post.caption}
                    </p>
                  </div>
                </div>
              ) : null}

              {!post.description && !post.caption ? (
                <div className="rounded-2xl border border-dashed border-zinc-300 bg-zinc-50 p-6 text-center">
                  <p className="text-sm text-zinc-500">
                    Este post ainda não possui descrição ou legenda cadastrada.
                  </p>
                </div>
              ) : null}
            </div>
          </section>

          <aside className="lg:sticky lg:top-6 lg:self-start">
            <PublicApprovalPanel
              token={token}
              postId={post.id}
              postTitle={post.title}
              visitorName={visitorName}
            />
          </aside>
        </div>
      </div>
    </main>
  );
}