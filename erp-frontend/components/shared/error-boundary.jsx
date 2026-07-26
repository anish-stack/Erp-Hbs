'use client';

import React from 'react';
import { ErrorState } from '@/components/shared/error-state';

/*
  React error boundary you can wrap around any component/section to localise a
  crash. Pass `name` so the fallback tells you exactly which part broke, e.g.
      <ErrorBoundary name="DataTable (Sales orders)">
        <DataTable ... />
      </ErrorBoundary>
  It also logs the component stack to the console with the boundary name, so a
  failing child is easy to find during development.
*/
export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    // eslint-disable-next-line no-console
    console.error(
      `[ErrorBoundary${this.props.name ? `: ${this.props.name}` : ''}]`,
      error,
      info?.componentStack
    );
  }

  reset = () => this.setState({ error: null });

  render() {
    if (this.state.error) {
      if (this.props.fallback) return this.props.fallback(this.state.error, this.reset);
      return <ErrorState where={this.props.name} error={this.state.error} reset={this.reset} />;
    }
    return this.props.children;
  }
}
