'use client';
import { useState } from 'react';
import { resolveComment } from '@/actions/comments';
import { Icon } from '@/components/ui/Icon';
import { toast } from 'sonner';

export default function ResolveCommentButton({ commentId }: { commentId: string }) {
  const [loading, setLoading] = useState(false);

  async function handleResolve() {
    setLoading(true);
    const result = await resolveComment(commentId);
    if (!result.success) {
      toast.error(result.error);
    } else {
      toast.success('Observação marcada como resolvida!');
    }
    setLoading(false);
  }

  return (
    <button
      onClick={handleResolve}
      disabled={loading}
      className="btn btn-ghost btn-sm"
      style={{ flexShrink: 0, color: 'var(--green)', borderColor: 'var(--green-100)', fontSize: 12 }}>
      <Icon name="check" size={12} />
      {loading ? 'Salvando…' : 'Resolver'}
    </button>
  );
}
