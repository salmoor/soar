const Bolt = require('../../../managers/virtual_stack/Bolt.manager');

describe('Bolt Manager', () => {
    let mockReq;
    let mockRes;
    let mockNext;
    let mockEnd;
    let mockMwsRepo;
    let bolt;

    beforeEach(() => {
        mockReq = {};
        mockRes = {
            end: jest.fn()
        };
        mockNext = jest.fn();
        mockEnd = jest.fn();
        mockMwsRepo = {
            testMiddleware: jest.fn(({ next }) => next()),
            errorMiddleware: jest.fn(() => {
                throw new Error('Middleware error');
            }),
        };
    });

    describe('end()', () => {
        it('should handle end call on last middleware', () => {
            bolt = new Bolt({
                mwsRepo: mockMwsRepo,
                stack: ['testMiddleware'],
                req: mockReq,
                res: mockRes,
                index: 0
            });
            bolt.index = 0;
            
            bolt.end({ error: 'Test error' });
            
            expect(mockReq.stackError).toBe('Test error');
            expect(mockRes.end).toHaveBeenCalled();
        });

        it('should handle end call with default error', () => {
            bolt = new Bolt({
                mwsRepo: mockMwsRepo,
                stack: ['testMiddleware'],
                req: mockReq,
                res: mockRes
            });
            
            bolt.end();
            
            expect(mockReq.stackError).toBe('Unexpected Failure');
        });

        it('should handle end call in middle of stack', () => {
            bolt = new Bolt({
                mwsRepo: mockMwsRepo,
                stack: ['first', 'second', 'third'],
                req: mockReq,
                res: mockRes
            });
            bolt.index = 1;
            bolt.run = jest.fn();
            
            bolt.end({ error: 'Mid-stack error' });
            
            expect(mockReq.stackError).toBe('Mid-stack error');
            expect(bolt.index).toBe(2);
            expect(bolt.run).toHaveBeenCalledWith({ index: 2 });
        });
    });

    describe('run()', () => {
        it('should handle missing middleware function', () => {
            bolt = new Bolt({
                mwsRepo: mockMwsRepo,
                stack: ['nonexistentMiddleware'],
                req: mockReq,
                res: mockRes
            });

            bolt.end = jest.fn();
            bolt.run();

            expect(bolt.end).toHaveBeenCalledWith({
                error: 'function not found on function nonexistentMiddleware '
            });
        });

        it('should handle middleware execution errors', () => {
            bolt = new Bolt({
                mwsRepo: mockMwsRepo,
                stack: ['errorMiddleware'],
                req: mockReq,
                res: mockRes
            });

            bolt.end = jest.fn();
            bolt.run();

            expect(bolt.end).toHaveBeenCalledWith({
                error: expect.stringContaining('execution failed')
            });
        });
    });

    describe('next()', () => {
        it('should call onDone when reaching end of stack', () => {
            const mockOnDone = jest.fn();
            bolt = new Bolt({
                mwsRepo: mockMwsRepo,
                stack: ['testMiddleware'],
                req: mockReq,
                res: mockRes,
                onDone: mockOnDone
            });

            bolt.next({}, 1);

            expect(mockOnDone).toHaveBeenCalledWith({
                req: mockReq,
                res: mockRes,
                results: expect.any(Object)
            });
        });
    });
});
